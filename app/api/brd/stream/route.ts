import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';
import { buildDiscoveryPrompt } from '@/lib/brd/prompts/discovery';
import { buildOptimizationPrompt } from '@/lib/brd/prompts/optimization';
import { buildSolutionsPrompt } from '@/lib/brd/prompts/solutions';
import { RepetitionGuard } from '@/lib/brd/repetition';
import { sanitizeMermaid } from '@/lib/brd/mermaid';
import { sanitizeImageReferences } from '@/lib/brd/sanitize';
import { chunkText } from '@/lib/brd/chunking';
import { buildExtractionPrompt } from '@/lib/brd/prompts/extract';

// Vercel Hobby enforces a 4.5 MB function payload limit.
// JSON-encoding 300 K chars costs ~600 KB, leaving plenty of headroom.
// The map-reduce chunking pipeline handles large docs server-side anyway.
const MAX_INPUT_CHARS = 300_000;
export const maxDuration = 300;
export const runtime = 'nodejs';

const ALLOWED_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'];

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface StreamPhaseResult {
  content: string;
  reasoning: string;
  /** True if a repetition loop forced an early abort on every attempt. */
  looped: boolean;
}

/**
 * Run a streaming chat completion guarded against repetition loops.
 *
 * Reasoning tokens are forwarded to the client via `onReasoning`. A
 * RepetitionGuard watches both the reasoning and content streams; if the model
 * degenerates into a loop ("app app app...") the current attempt is aborted and
 * retried with anti-repetition sampling (frequency/presence penalties + lower
 * temperature). After the final attempt we return whatever we have.
 */
async function streamGuardedCompletion(
  openai: OpenAI,
  model: string,
  messages: ChatMessage[],
  onReasoning: (text: string) => void,
  onStatus: (text: string) => void,
): Promise<StreamPhaseResult> {
  const MAX_ATTEMPTS = 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const isRetry = attempt > 0;
    const guard = new RepetitionGuard();
    let content = '';
    let reasoning = '';
    let looped = false;

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: isRetry ? 0.15 : 0.3,
      // On retry, push the model away from repeating tokens/phrases.
      ...(isRetry ? { frequency_penalty: 1.0, presence_penalty: 0.6 } : {}),
      stream: true,
    });

    try {
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        const reasoningTok = (delta as unknown as { reasoning_content?: string }).reasoning_content;
        if (reasoningTok) {
          reasoning += reasoningTok;
          onReasoning(reasoningTok);
          if (guard.push(reasoningTok)) {
            looped = true;
            break;
          }
        }

        if (delta.content) {
          content += delta.content;
          if (guard.push(delta.content)) {
            looped = true;
            break;
          }
        }
      }
    } finally {
      // Stop the underlying request if we bailed out early.
      if (looped) completion.controller.abort();
    }

    // Good output, or content already looks like complete JSON — accept it.
    if (!looped) {
      return { content, reasoning, looped: false };
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      onStatus('Detected a repetition loop — retrying with stricter settings...');
    } else {
      return { content, reasoning, looped: true };
    }
  }

  return { content: '', reasoning: '', looped: true };
}

/**
 * Streaming BRD analysis — sends reasoning tokens in real-time via SSE.
 * The client sees live analysis progress, then gets the final result.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, title, fileName, model } = body as {
    text: string;
    title: string;
    fileName: string | null;
    model?: string;
  };

  // Validate and sanitize input
  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  let cleanText = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  cleanText = sanitizeImageReferences(cleanText);

  if (cleanText.length < 50) {
    return new Response(JSON.stringify({ error: 'Document contains no readable text after sanitization' }), { status: 400 });
  }
  if (cleanText.length > MAX_INPUT_CHARS) {
    return new Response(JSON.stringify({ error: 'Text too long' }), { status: 400 });
  }

  const selectedModel = model && ALLOWED_MODELS.includes(model) ? model : 'deepseek-v4-pro';

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing DeepSeek API key' }), { status: 500 });
  }

  const trimmedText = cleanText;
  const supabase = await createClient();

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });

  // Create document record
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
    return new Response(JSON.stringify({ error: docError.message }), { status: 500 });
  }

  const documentId = doc.id;

  // Create a readable stream that sends SSE events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      send('doc_id', documentId);

      try {
        let finalAnalysisText = trimmedText;

        if (trimmedText.length > 25000) {
          send('phase', 'chunking');
          send('status', 'Document is large. Splitting for parallel extraction...');
          
          const chunks = chunkText(trimmedText, 25000, 1000);
          send('status', `Processing ${chunks.length} chunks in parallel...`);

          const extractionPromises = chunks.map(async (chunk) => {
            try {
              const res = await openai.chat.completions.create({
                model: 'deepseek-chat', // Fast, cheap model for extraction
                messages: [{ role: 'user', content: buildExtractionPrompt(chunk.content, chunk.index, chunks.length) }],
                temperature: 0.1,
              });
              return res.choices[0]?.message?.content || '';
            } catch (err) {
              console.error(`Chunk ${chunk.index} failed:`, err);
              return ''; // Gracefully fail chunk
            }
          });

          const extractedContents = await Promise.all(extractionPromises);
          finalAnalysisText = extractedContents.filter(Boolean).join('\n\n---\n\n');
          finalAnalysisText = sanitizeImageReferences(finalAnalysisText);
          send('status', 'Extraction complete. Starting distilled core analysis...');
        } else {
          send('status', 'Starting core analysis...');
        }

        // --- Stream Core prompt (features + flow) ---
        send('phase', 'core');

        const core = await streamGuardedCompletion(
          openai,
          selectedModel,
          [
            { role: 'system', content: 'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.' },
            { role: 'user', content: buildCorePrompt(finalAnalysisText) },
          ],
          (tok) => send('reasoning', tok),
          (msg) => send('status', msg),
        );
        const coreContent = core.content;
        const coreReasoning = core.reasoning;

        if (core.looped && !coreContent.trim()) {
          throw new Error('Renata got stuck in a repetition loop and produced no usable output. Please try again.');
        }

        send('status', 'Core analysis complete. Processing results...');

        // Parse core result
        const coreClean = coreContent
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        let coreResult: { features?: unknown[]; flow_process?: unknown[] } = { features: [], flow_process: [] };
        try {
          coreResult = JSON.parse(coreClean);
        } catch (e) {
          send('error', `Core JSON parse failed: ${(e as Error).message}`);
        }

        const features = Array.isArray(coreResult.features) ? coreResult.features.slice(0, 20) : [];
        const flowProcess = Array.isArray(coreResult.flow_process) ? coreResult.flow_process : [];

        // Save core results to DB
        await supabase.from('brd_documents').update({ flow_process: flowProcess }).eq('id', documentId);
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'flow_process' });

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
              console.warn('Rejected requirement_classification, falling back to functional_requirement:', f.requirement_classification);
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
          await supabase.from('brd_features').insert(featureRows);
        }
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'features' });

        send('core_done', JSON.stringify({ features, flow_process: flowProcess }));

        // --- Stream Advisory prompt ---
        send('phase', 'advisory');
        send('status', 'Starting advisory analysis...');

        const advisory = await streamGuardedCompletion(
          openai,
          selectedModel,
          [
            { role: 'system', content: 'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.' },
            { role: 'user', content: buildAdvisoryPrompt(finalAnalysisText) },
          ],
          (tok) => send('reasoning', tok),
          (msg) => send('status', msg),
        );
        const advisoryContent = advisory.content;

        send('status', 'Advisory analysis complete. Processing...');

        // Parse advisory result
        const advisoryClean = advisoryContent
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        let advisoryResult: Record<string, unknown> = {};
        try {
          advisoryResult = JSON.parse(advisoryClean);
        } catch (e) {
          send('error', `Advisory JSON parse failed: ${(e as Error).message}`);
        }

        const improvements = Array.isArray(advisoryResult.IMPROVEMENTS) ? advisoryResult.IMPROVEMENTS.slice(0, 15) : [];
        const questions = Array.isArray(advisoryResult.QUESTIONS) ? advisoryResult.QUESTIONS.slice(0, 15) : [];
        const riskAnalysis = Array.isArray(advisoryResult.RISK_ANALYSIS) ? advisoryResult.RISK_ANALYSIS.slice(0, 15) : [];
        const contextDiagram = typeof advisoryResult.CONTEXT_DIAGRAM === 'string'
          ? sanitizeMermaid(advisoryResult.CONTEXT_DIAGRAM)
          : '';
        const impactedComponents = Array.isArray(advisoryResult.IMPACTED_COMPONENTS) ? advisoryResult.IMPACTED_COMPONENTS.slice(0, 20) : [];
        const useCaseScenarios = Array.isArray(advisoryResult.USE_CASE_SCENARIOS) ? advisoryResult.USE_CASE_SCENARIOS.slice(0, 20) : [];

        // Save advisory to DB
        await supabase.from('brd_documents').update({
          improvements,
          questions,
          risk_analysis: riskAnalysis,
          context_diagram: contextDiagram,
          impacted_components: impactedComponents,
          use_case_scenarios: useCaseScenarios,
          analysis_status: 'completed',
        }).eq('id', documentId);

        // Send final complete event
        send('complete', JSON.stringify({
          documentId,
          features,
          flow_process: flowProcess,
          improvements,
          questions,
          risk_analysis: riskAnalysis,
          context_diagram: contextDiagram,
          impacted_components: impactedComponents,
          use_case_scenarios: useCaseScenarios,
          reasoning: coreReasoning,
        }));

        // Run discovery, optimization, and solutions prompts in parallel
        // Results will be stored in the next iteration
        try {
          const featuresJson = JSON.stringify(features.map((f: any) => ({
            id: f.feature_id,
            name: f.name,
            description: f.description,
          })));

          await Promise.all([
            streamGuardedCompletion(
              openai,
              selectedModel,
              [
                { role: 'system', content: 'You are an expert business analyst. Generate discovery questions to gather missing requirements.' },
                { role: 'user', content: buildDiscoveryPrompt(finalAnalysisText, featuresJson) },
              ],
              () => {},
              () => {},
            ),
            streamGuardedCompletion(
              openai,
              selectedModel,
              [
                { role: 'system', content: 'You are an expert business analyst. Generate optimization suggestions.' },
                { role: 'user', content: buildOptimizationPrompt(finalAnalysisText, featuresJson) },
              ],
              () => {},
              () => {},
            ),
            streamGuardedCompletion(
              openai,
              selectedModel,
              [
                { role: 'system', content: 'You are a solution architect. Map technical solutions to requirements.' },
                { role: 'user', content: buildSolutionsPrompt(finalAnalysisText, featuresJson) },
              ],
              () => {},
              () => {},
            ),
          ]);
        } catch (err) {
          // Non-critical, mock data will be used in frontend
          console.error('Additional prompts failed:', err);
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send('error', msg);
        await supabase.from('brd_documents').update({ analysis_status: 'failed' }).eq('id', documentId);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
