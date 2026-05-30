import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';

const MAX_INPUT_CHARS = 100_000;

// Allow up to 5 minutes for the analysis (Vercel Pro/Enterprise).
// On Hobby tier the hard limit is lower; the frontend's 3-min abort still protects us.
export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * BRD Analysis — 2 parallel LLM calls, each saved to the DB independently
 * as soon as it completes. The frontend subscribes via Supabase real-time
 * so sections appear progressively without waiting for the slower call.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, title, fileName, model } = body as {
      text: string;
      title: string;
      fileName: string | null;
      model?: string;
    };

    // Validate model — only allow known DeepSeek models
    const ALLOWED_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'];
    const selectedModel = model && ALLOWED_MODELS.includes(model) ? model : 'deepseek-v4-pro';

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No document text provided' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'No document title provided' }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 50) {
      return NextResponse.json({ error: 'Document text is too short (minimum 50 characters)' }, { status: 400 });
    }
    if (trimmedText.length > MAX_INPUT_CHARS) {
      return NextResponse.json({ error: `Document text exceeds maximum length (${MAX_INPUT_CHARS} characters)` }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Oracle is not configured. Missing API key.' }, { status: 500 });
    }

    const supabase = await createClient();
    const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey });

    // Create document record with status 'analyzing'
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .insert({
        title,
        source_text: trimmedText,
        file_name: fileName,
        analysis_status: 'analyzing',
        sections_completed: [],
      })
      .select()
      .single();

    if (docError) {
      return NextResponse.json({ error: `Failed to create document: ${docError.message}` }, { status: 500 });
    }

    const documentId = doc.id;

    // Helper: call DeepSeek and parse JSON
    const callLLM = async (prompt: string): Promise<unknown> => {
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: 'You are an expert business analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });
      const responseText = completion.choices[0]?.message?.content || '';
      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleaned);
    };

    // --- Core section: features + flow process ---
    const corePromise = callLLM(buildCorePrompt(trimmedText))
      .then(async (result) => {
        const core = result as { features?: unknown[]; flow_process?: unknown[] };
        const features = Array.isArray(core.features) ? core.features.slice(0, 20) : [];
        const flowProcess = Array.isArray(core.flow_process) ? core.flow_process : [];

        // Save flow to document + mark sections complete
        const { error: updErr } = await supabase
          .from('brd_documents')
          .update({ flow_process: flowProcess })
          .eq('id', documentId);
        if (updErr) console.error('Flow update failed:', updErr);

        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'flow_process' });

        // Save features to brd_features
        if (features.length > 0) {
          const featureRows = (features as Record<string, unknown>[]).map((f) => ({
            document_id: documentId,
            name: typeof f.name === 'string' ? f.name.slice(0, 100) : 'Unnamed',
            description: typeof f.description === 'string' ? f.description.slice(0, 800) : null,
            pilot_status: 'unknown',
            retention: null,
            business_flow: typeof f.business_flow === 'string' ? f.business_flow : null,
            as_is: typeof f.as_is === 'string' ? f.as_is : null,
            to_be: typeof f.to_be === 'string' ? f.to_be : null,
            risks: typeof f.risks === 'string' ? f.risks : null,
            suggested_priority: ['normal', 'rare', 'epic', 'legendary'].includes(String(f.suggested_priority))
              ? f.suggested_priority : 'normal',
            requirement_type: String(f.requirement_type || '').toLowerCase().replace(/-/g, '_').includes('non_functional') ? 'non_functional' : 'functional',
            precondition: typeof f.precondition === 'string' ? f.precondition : null,
            postcondition: typeof f.postcondition === 'string' ? f.postcondition : null,
            user_roles: Array.isArray(f.user_roles) ? f.user_roles.filter((r: unknown) => typeof r === 'string') : [],
            impacted_process: typeof f.impacted_process === 'string' ? f.impacted_process : null,
            scope: ['in_scope', 'out_of_scope'].includes(String(f.scope)) ? f.scope : 'unknown',
            accounting_impact: typeof f.accounting_impact === 'string' ? f.accounting_impact : null,
          }));
          const { error: featErr } = await supabase.from('brd_features').insert(featureRows);
          if (featErr) console.error('Feature insert failed:', featErr);
        }
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'features' });

        return { features, flowProcess };
      })
      .catch(async (err) => {
        console.error('Core prompt failed:', err);
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'core_error' });
        return { features: [], flowProcess: [] };
      });

    // --- Advisory section: improvements + questions + risks + architecture + impacted systems + FSD ---
    const advisoryPromise = callLLM(buildAdvisoryPrompt(trimmedText))
      .then(async (result) => {
        const adv = result as {
          improvements?: unknown[];
          questions?: unknown[];
          risk_analysis?: unknown[];
          architecture_diagram?: string;
          impacted_systems?: unknown[];
          fsd_design?: unknown[];
        };
        const improvements = Array.isArray(adv.improvements) ? adv.improvements.slice(0, 15) : [];
        const questions = Array.isArray(adv.questions) ? adv.questions.slice(0, 15) : [];
        const riskAnalysis = Array.isArray(adv.risk_analysis) ? adv.risk_analysis.slice(0, 15) : [];
        const architectureDiagram = typeof adv.architecture_diagram === 'string' ? adv.architecture_diagram : '';
        const impactedSystems = Array.isArray(adv.impacted_systems) ? adv.impacted_systems.slice(0, 20) : [];
        const fsdDesign = Array.isArray(adv.fsd_design) ? adv.fsd_design.slice(0, 20) : [];

        const { error: updErr } = await supabase
          .from('brd_documents')
          .update({
            improvements,
            questions,
            risk_analysis: riskAnalysis,
            architecture_diagram: architectureDiagram,
            impacted_systems: impactedSystems,
            fsd_design: fsdDesign,
          })
          .eq('id', documentId);
        if (updErr) console.error('Advisory update failed:', updErr);

        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'improvements' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'questions' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'risk_analysis' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'architecture' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'impacted_systems' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'fsd_design' });

        return { improvements, questions, riskAnalysis, architectureDiagram, impactedSystems, fsdDesign };
      })
      .catch(async (err) => {
        console.error('Advisory prompt failed:', err);
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'advisory_error' });
        return { improvements: [], questions: [], riskAnalysis: [], architectureDiagram: '', impactedSystems: [], fsdDesign: [] };
      });

    // Wait for both, then mark final status
    const [coreRes, advisoryRes] = await Promise.all([corePromise, advisoryPromise]);

    await supabase
      .from('brd_documents')
      .update({ analysis_status: 'completed' })
      .eq('id', documentId);

    return NextResponse.json({
      documentId,
      status: 'completed',
      features: coreRes.features,
      flow_process: coreRes.flowProcess,
      improvements: advisoryRes.improvements,
      questions: advisoryRes.questions,
      risk_analysis: advisoryRes.riskAnalysis,
      architecture_diagram: advisoryRes.architectureDiagram,
      impacted_systems: advisoryRes.impactedSystems,
      fsd_design: advisoryRes.fsdDesign,
    });
  } catch (error) {
    console.error('BRD analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Oracle failed: ${message}` }, { status: 500 });
  }
}
