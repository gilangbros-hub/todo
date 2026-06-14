import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';
import { sanitizeBrdText, validateBrdInput, validateTextLength, stripMarkdownFences } from '@/lib/brd/text';
import { selectModel, getDeepSeekApiKey, createDeepSeekClient, BA_SYSTEM_PROMPT } from '@/lib/brd/deepseek';
import { mapFeatureRows } from '@/lib/brd/features';
import { runChunkExtraction } from '@/lib/brd/pipeline';

// Vercel Hobby tier caps at 60 s. The non-streaming route is more
// constrained than the SSE streaming route — prefer /api/brd/stream.
export const maxDuration = 60;
export const runtime = 'nodejs';

/** Max content tokens per LLM call. */
const MAX_TOKENS = 16_384;
/** Abort a single LLM call after this many ms. */
const CALL_TIMEOUT_MS = 55_000;

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

    const selectedModel = selectModel(model);

    // Validate and sanitize input
    const inputErr = validateBrdInput(text, title);
    if (inputErr) {
      return NextResponse.json({ error: inputErr.error }, { status: inputErr.status });
    }

    const trimmedText = sanitizeBrdText(text);

    const lengthErr = validateTextLength(trimmedText);
    if (lengthErr) {
      return NextResponse.json({ error: lengthErr.error }, { status: lengthErr.status });
    }

    const apiKey = getDeepSeekApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Renata is not configured. Missing DeepSeek API key.' }, { status: 500 });
    }

    const supabase = await createClient();
    const openai = createDeepSeekClient(apiKey);

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
    const finalAnalysisText = await runChunkExtraction(openai, trimmedText);

    // Helper: call DeepSeek and parse JSON, with a hard timeout.
    const callLLM = async (prompt: string): Promise<unknown> => {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), CALL_TIMEOUT_MS);
      try {
        const completion = await openai.chat.completions.create(
          {
            model: selectedModel,
            messages: [
              { role: 'system', content: BA_SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: MAX_TOKENS,
          },
          { signal: abort.signal },
        );
        const responseText = completion.choices[0]?.message?.content || '';
        return JSON.parse(stripMarkdownFences(responseText));
      } finally {
        clearTimeout(timer);
      }
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
        if (updErr) throw new Error(`Flow update failed: ${updErr.message}`);

        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'flow_process' });

        // Save features to brd_features
        if (features.length > 0) {
          const featureRows = mapFeatureRows(features, documentId);
          const { error: featErr } = await supabase.from('brd_features').insert(featureRows);
          if (featErr) throw new Error(`Feature insert failed: ${featErr.message}`);
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
        if (updErr) throw new Error(`Advisory update failed: ${updErr.message}`);

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

    // Wait for both sections
    const [coreRes, advisoryRes] = await Promise.all([corePromise, advisoryPromise]);

    // NOTE: Discovery / optimization / solutions prompts were previously
    // fired here but their results were never persisted — they only burned
    // API credits and extended the function lifetime.  Removed intentionally.

    const { error: statusErr } = await supabase
      .from('brd_documents')
      .update({ analysis_status: 'completed' })
      .eq('id', documentId);
    if (statusErr) console.error('Status update to completed failed:', statusErr.message);

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
