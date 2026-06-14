import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';
import { buildDiscoveryPrompt } from '@/lib/brd/prompts/discovery';
import { buildOptimizationPrompt } from '@/lib/brd/prompts/optimization';
import { buildSolutionsPrompt } from '@/lib/brd/prompts/solutions';
import { chunkText } from '@/lib/brd/chunking';
import { buildExtractionPrompt } from '@/lib/brd/prompts/extract';

// Vercel Hobby enforces a 4.5 MB function payload limit.
// JSON-encoding 300 K chars costs ~600 KB, leaving plenty of headroom.
// The map-reduce chunking pipeline handles large docs server-side anyway.
const MAX_INPUT_CHARS = 300_000;

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

    const ALLOWED_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'];
    const selectedModel = model && ALLOWED_MODELS.includes(model) ? model : 'deepseek-v4-pro';

    // Validate and sanitize input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No document text provided' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'No document title provided' }, { status: 400 });
    }

    const trimmedText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/(\S+\/)?image\s*\d*\.(png|jpg|jpeg|gif|bmp|svg|tiff|webp)/gi, '[image]')
      .replace(/\[image:\s*\S+\.(png|jpg|jpeg|gif)\]/gi, '[image]')
      .trim();

    if (trimmedText.length < 50) {
      return NextResponse.json({ error: 'Document text is too short (minimum 50 characters)' }, { status: 400 });
    }
    if (trimmedText.length > MAX_INPUT_CHARS) {
      return NextResponse.json({ error: `Document text exceeds maximum length (${MAX_INPUT_CHARS} characters)` }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Renata is not configured. Missing DeepSeek API key.' }, { status: 500 });
    }

    const supabase = await createClient();
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });

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

    // --- Map-Reduce Chunking Phase ---
    let finalAnalysisText = trimmedText;

    if (trimmedText.length > 25000) {
      const chunks = chunkText(trimmedText, 25000, 1000);
      const extractionPromises = chunks.map(async (chunk) => {
        try {
          const res = await openai.chat.completions.create({
            model: 'deepseek-chat', // Fast model for extraction
            messages: [{ role: 'user', content: buildExtractionPrompt(chunk.content, chunk.index, chunks.length) }],
            temperature: 0.1,
          });
          return res.choices[0]?.message?.content || '';
        } catch (err) {
          console.error(`Chunk ${chunk.index} failed:`, err);
          return '';
        }
      });
      const extractedContents = await Promise.all(extractionPromises);
      finalAnalysisText = extractedContents.filter(Boolean).join('\n\n---\n\n');
    }

    // Helper: call DeepSeek and parse JSON
    const callLLM = async (prompt: string): Promise<unknown> => {
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: 'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.' },
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
    const corePromise = callLLM(buildCorePrompt(finalAnalysisText))
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
            feature_id: typeof f.feature_id === 'string' ? f.feature_id.slice(0, 50) : 'F-UNKNOWN',
            name: typeof f.name === 'string' ? f.name.slice(0, 100) : 'Unnamed',
            description: typeof f.description === 'string' ? f.description.slice(0, 800) : '',
            requirement_classification: (() => {
              const raw = String(f.requirement_classification || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
              const valid = ['business_requirement', 'stakeholder_requirement', 'functional_requirement', 'non_functional_requirement', 'transition_requirement'];
              if (valid.includes(raw)) return raw;
              return 'functional_requirement';
            })(),
            priority_moscow: ['must_have', 'should_have', 'could_have', 'wont_have'].includes(String(f.priority_moscow))
              ? f.priority_moscow : 'should_have',
            business_value: typeof f.business_value === 'string' ? f.business_value : '',
            capability_gap: typeof f.capability_gap === 'string' ? f.capability_gap : '',
            business_rules: Array.isArray(f.business_rules) ? f.business_rules.filter((r: unknown) => typeof r === 'string') : [],
            stakeholders: Array.isArray(f.stakeholders) ? f.stakeholders.filter((r: unknown) => typeof r === 'string') : [],
            preconditions: typeof f.preconditions === 'string' ? f.preconditions : '',
            postconditions: typeof f.postconditions === 'string' ? f.postconditions : '',
            acceptance_criteria: Array.isArray(f.acceptance_criteria) ? f.acceptance_criteria.filter((r: unknown) => typeof r === 'string') : [],
            dependencies_and_risks: typeof f.dependencies_and_risks === 'string' ? f.dependencies_and_risks : '',
            accounting_impact: typeof f.accounting_impact === 'string' ? f.accounting_impact : '',
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
    const advisoryPromise = callLLM(buildAdvisoryPrompt(finalAnalysisText))
      .then(async (result) => {
        const adv = result as {
          IMPROVEMENTS?: unknown[];
          QUESTIONS?: unknown[];
          RISK_ANALYSIS?: unknown[];
          CONTEXT_DIAGRAM?: string;
          IMPACTED_COMPONENTS?: unknown[];
          USE_CASE_SCENARIOS?: unknown[];
        };
        const improvements = Array.isArray(adv.IMPROVEMENTS) ? adv.IMPROVEMENTS.slice(0, 15) : [];
        const questions = Array.isArray(adv.QUESTIONS) ? adv.QUESTIONS.slice(0, 15) : [];
        const riskAnalysis = Array.isArray(adv.RISK_ANALYSIS) ? adv.RISK_ANALYSIS.slice(0, 15) : [];
        const contextDiagram = typeof adv.CONTEXT_DIAGRAM === 'string' ? adv.CONTEXT_DIAGRAM : '';
        const impactedComponents = Array.isArray(adv.IMPACTED_COMPONENTS) ? adv.IMPACTED_COMPONENTS.slice(0, 20) : [];
        const useCaseScenarios = Array.isArray(adv.USE_CASE_SCENARIOS) ? adv.USE_CASE_SCENARIOS.slice(0, 20) : [];

        const { error: updErr } = await supabase
          .from('brd_documents')
          .update({
            improvements,
            questions,
            risk_analysis: riskAnalysis,
            context_diagram: contextDiagram,
            impacted_components: impactedComponents,
            use_case_scenarios: useCaseScenarios,
          })
          .eq('id', documentId);
        if (updErr) console.error('Advisory update failed:', updErr);

        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'improvements' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'questions' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'risk_analysis' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'context_diagram' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'impacted_components' });
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'use_case_scenarios' });

        return { improvements, questions, riskAnalysis, contextDiagram, impactedComponents, useCaseScenarios };
      })
      .catch(async (err) => {
        console.error('Advisory prompt failed:', err);
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'advisory_error' });
        return { improvements: [], questions: [], riskAnalysis: [], contextDiagram: '', impactedComponents: [], useCaseScenarios: [] };
      });

    // Wait for both, then run additional prompts
    const [coreRes, advisoryRes] = await Promise.all([corePromise, advisoryPromise]);

    // Run discovery, optimization, and solutions prompts in parallel
    try {
      const featuresJson = JSON.stringify(coreRes.features.map((f: any) => ({
        id: f.feature_id,
        name: f.name,
        description: f.description,
      })));

      await Promise.all([
        callLLM(buildDiscoveryPrompt(finalAnalysisText, featuresJson)),
        callLLM(buildOptimizationPrompt(finalAnalysisText, featuresJson)),
        callLLM(buildSolutionsPrompt(finalAnalysisText, featuresJson)),
      ]);
    } catch (err) {
      // Non-critical, mock data will be used in frontend
      console.error('Additional prompts failed:', err);
    }

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
      context_diagram: advisoryRes.contextDiagram,
      impacted_components: advisoryRes.impactedComponents,
      use_case_scenarios: advisoryRes.useCaseScenarios,
    });
  } catch (error) {
    console.error('BRD analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
