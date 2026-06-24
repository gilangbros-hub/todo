import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';
import { RepetitionGuard } from '@/lib/brd/repetition';
import { sanitizeMermaid } from '@/lib/brd/mermaid';
import { sanitizeBrdText, validateTextLength, stripMarkdownFences } from '@/lib/brd/text';
import { selectModel, getApiKeyForModel, createLLMClient, BA_SYSTEM_PROMPT } from '@/lib/brd/deepseek';
import { mapFeatureRows } from '@/lib/brd/features';
import { runChunkExtraction } from '@/lib/brd/pipeline';

export const maxDuration = 300;
export const runtime = 'nodejs';

/** Max content tokens per LLM call (reasoning tokens are separate). */
const MAX_TOKENS = 16_384;
/** Abort a single LLM phase after this many ms. */
const PHASE_TIMEOUT_MS = 180_000;
/** SSE heartbeat interval to prevent Vercel idle-disconnect. */
const HEARTBEAT_MS = 10_000;

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface StreamPhaseResult {
  content: string;
  reasoning: string;
  /** True if a repetition loop forced an early abort on every attempt. */
  looped: boolean;
}

interface StreamOptions {
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Run a streaming chat completion guarded against repetition loops *and*
 * a hard wall-clock timeout.
 *
 * Reasoning tokens are forwarded to the client via `onReasoning`. A
 * RepetitionGuard watches both the reasoning and content streams; if the model
 * degenerates into a loop ("app app app...") the current attempt is aborted and
 * retried with anti-repetition sampling (frequency/presence penalties + lower
 * temperature). After the final attempt we return whatever we have.
 *
 * If the phase exceeds `timeoutMs` the LLM call is aborted and the partial
 * content collected so far is returned — callers should treat it as best-effort.
 */
async function streamGuardedCompletion(
  openai: OpenAI,
  model: string,
  messages: ChatMessage[],
  onReasoning: (text: string) => void,
  onStatus: (text: string) => void,
  options: StreamOptions = {},
): Promise<StreamPhaseResult> {
  const { maxTokens = MAX_TOKENS, timeoutMs = PHASE_TIMEOUT_MS, signal } = options;
  const MAX_ATTEMPTS = 2;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      return { content: '', reasoning: '', looped: false };
    }

    const isRetry = attempt > 0;
    const guard = new RepetitionGuard();
    let content = '';
    let reasoning = '';
    let looped = false;
    let timedOut = false;

    // Per-phase abort — fires on timeout OR when the parent signal aborts.
    const phaseAbort = new AbortController();
    const timer = setTimeout(() => {
      timedOut = true;
      phaseAbort.abort();
    }, timeoutMs);

    const propagateAbort = () => phaseAbort.abort();
    signal?.addEventListener('abort', propagateAbort, { once: true });

    try {
      const completion = await openai.chat.completions.create(
        {
          model,
          messages,
          temperature: isRetry ? 0.15 : 0.3,
          max_tokens: maxTokens,
          // On retry, push the model away from repeating tokens/phrases.
          ...(isRetry ? { frequency_penalty: 1.0, presence_penalty: 0.6 } : {}),
          stream: true,
        },
        { signal: phaseAbort.signal },
      );

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
    } catch (err) {
      if (timedOut || phaseAbort.signal.aborted) {
        onStatus(timedOut ? 'Phase timed out — returning available results...' : 'Analysis stopped.');
        return { content, reasoning, looped: false };
      }
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`LLM call failed: ${detail}`);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', propagateAbort);
    }
  }

  return { content: '', reasoning: '', looped: true };
}

/**
 * Streaming BRD analysis — sends reasoning tokens in real-time via SSE.
 * The client sees live analysis progress, then gets the final result.
 *
 * Designed for Vercel Hobby tier: a heartbeat keeps the connection alive
 * during non-streaming moments (DB writes) and each LLM phase has a hard
 * timeout so the function always terminates.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const { text, title, fileName, model, documentId: reqDocumentId } = body as {
    text: string;
    title: string;
    fileName: string | null;
    model?: string;
    documentId?: string;
  };

  // Skip text validation if we're resuming (text might be empty)
  if (!reqDocumentId && (!text || typeof text !== 'string' || text.trim().length < 50)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  let cleanText = '';
  if (text) {
    cleanText = sanitizeBrdText(text);
    const lengthErr = validateTextLength(cleanText);
    if (lengthErr) {
      return new Response(JSON.stringify({ error: lengthErr.error }), { status: lengthErr.status });
    }
  }

  const selectedModel = selectModel(model);

  const openai = createLLMClient(model);
  if (!openai) {
    return new Response(JSON.stringify({ error: 'Missing API key for selected model' }), { status: 500 });
  }

  const trimmedText = cleanText;
  const supabase = await createClient();

  let documentId = reqDocumentId;
  let sourceTextForAnalysis = trimmedText;
  let completedSections: string[] = [];

  if (documentId) {
    // Resume existing document
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .select('source_text, sections_completed')
      .eq('id', documentId)
      .single();

    if (docError) {
      return new Response(JSON.stringify({ error: `Document not found: ${docError.message}` }), { status: 404 });
    }
    
    // If text was provided in the request, use it (maybe client is passing state)
    // Otherwise use the source text from the DB
    sourceTextForAnalysis = text ? trimmedText : (doc.source_text || '');
    completedSections = doc.sections_completed || [];

    await supabase.from('brd_documents').update({ analysis_status: 'analyzing' }).eq('id', documentId);
  } else {
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
    
    documentId = doc.id;
  }

  // Create a readable stream that sends SSE events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          /* stream already closed */
        }
      };

      // Heartbeat keeps the Vercel edge/serverless proxy from killing idle
      // connections. SSE comments (lines starting with ':') are silently
      // discarded by EventSource clients and our manual parser alike.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      send('doc_id', documentId as string);

      try {
        let finalAnalysisText = sourceTextForAnalysis;
        let features: unknown[] = [];
        let flowProcess: unknown[] = [];

        // Skip extraction if core & advisory are both done
        // (Though if they are both done, we probably shouldn't be here)
        const hasCoreDone = completedSections.includes('features') && completedSections.includes('flow_process');
        
        if (!hasCoreDone) {
          if (sourceTextForAnalysis.length > 25000 && !completedSections.includes('chunk_extraction')) {
            send('phase', 'chunking');
            send('status', 'Document is large. Splitting for parallel extraction...');
            
            finalAnalysisText = await runChunkExtraction(openai, sourceTextForAnalysis);
            await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'chunk_extraction' });
            
            send('status', 'Extraction complete. Starting distilled core analysis...');
          } else if (sourceTextForAnalysis.length > 25000 && completedSections.includes('chunk_extraction')) {
             // If we already extracted chunks, ideally we'd load the concatenated extraction text here.
             // For now, if we resume and extraction is marked done, we just proceed with the raw text. 
             // (In a perfect system we'd persist the extracted summary and read it back, but let's keep it simple and just re-extract if needed or skip it based on db schema limits)
             send('status', 'Skipping large document extraction (already completed)...');
             // We re-run extraction to get the finalAnalysisText because we didn't save the intermediate string to DB.
             // This is a trade-off. We could save it, but since this route streams, we just let it run.
             finalAnalysisText = await runChunkExtraction(openai, sourceTextForAnalysis);
          } else {
            send('status', 'Starting core analysis...');
          }

          // --- Stream Core prompt (features + flow) ---
          send('phase', 'core');

          const core = await streamGuardedCompletion(
            openai,
            selectedModel,
            [
              { role: 'system', content: BA_SYSTEM_PROMPT },
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
          const coreClean = stripMarkdownFences(coreContent);

          let coreResult: { features?: unknown[]; flow_process?: unknown[] } = { features: [], flow_process: [] };
          try {
            coreResult = JSON.parse(coreClean);
          } catch (e) {
            send('error', `Core JSON parse failed: ${(e as Error).message}`);
          }

          features = Array.isArray(coreResult.features) ? coreResult.features.slice(0, 20) : [];
          flowProcess = Array.isArray(coreResult.flow_process) ? coreResult.flow_process : [];

          // Save core results to DB
          const { error: flowErr } = await supabase.from('brd_documents').update({ flow_process: flowProcess }).eq('id', documentId);
          if (flowErr) send('error', `Flow update failed: ${flowErr.message}`);
          await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'flow_process' });

          if (features.length > 0) {
            // Delete existing features for this document before inserting, in case we are re-running core
            await supabase.from('brd_features').delete().eq('document_id', documentId);
            
            const featureRows = mapFeatureRows(features, documentId as string);
            const { error: featErr } = await supabase.from('brd_features').insert(featureRows);
            if (featErr) send('error', `Feature insert failed: ${featErr.message}`);
          }
          await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'features' });

          send('core_done', JSON.stringify({ features, flow_process: flowProcess, reasoning: coreReasoning }));
        } else {
          send('status', 'Core analysis already completed. Skipping to advisory...');
          send('phase', 'advisory');
          
          // Need to set finalAnalysisText for advisory since we skipped extraction
          if (sourceTextForAnalysis.length > 25000) {
             finalAnalysisText = await runChunkExtraction(openai, sourceTextForAnalysis);
          }
        }

        // --- Stream Advisory prompt ---
        if (!completedSections.includes('advisory')) {
          send('phase', 'advisory');
          send('status', 'Starting advisory analysis...');

          const advisory = await streamGuardedCompletion(
            openai,
            selectedModel,
            [
              { role: 'system', content: BA_SYSTEM_PROMPT },
              { role: 'user', content: buildAdvisoryPrompt(finalAnalysisText) },
            ],
            (tok) => send('reasoning', tok),
            (msg) => send('status', msg),
          );
          const advisoryContent = advisory.content;

          send('status', 'Advisory analysis complete. Processing...');

          // Parse advisory result
          const advisoryClean = stripMarkdownFences(advisoryContent);

          let advisoryResult: Record<string, unknown> = {};
          
          if (advisoryClean) {
            try {
              // Attempt a loose JSON parse to salvage truncated JSON from timeout
              advisoryResult = JSON.parse(advisoryClean);
            } catch (e) {
              send('status', 'Advisory output was incomplete. Attempting to salvage partial data...');
              try {
                // VERY crude salvage for cut-off JSON (close arrays/objects)
                let salvaged = advisoryClean.trim();
                // Count unclosed brackets/braces
                let openBraces = (salvaged.match(/\{/g) || []).length - (salvaged.match(/\}/g) || []).length;
                let openBrackets = (salvaged.match(/\[/g) || []).length - (salvaged.match(/\]/g) || []).length;
                
                // If it ends in a trailing comma or string quote, clean it up
                salvaged = salvaged.replace(/,\s*$/, '');
                if ((salvaged.match(/"/g) || []).length % 2 !== 0) {
                  salvaged += '"';
                }
                
                // Close arrays first, then objects
                while (openBrackets > 0) { salvaged += ']'; openBrackets--; }
                while (openBraces > 0) { salvaged += '}'; openBraces--; }
                
                advisoryResult = JSON.parse(salvaged);
                send('status', 'Successfully salvaged partial advisory data.');
              } catch (salvageErr) {
                // Ignore salvage errors so we can at least return empty arrays and mark as complete
                send('status', 'Advisory JSON salvage failed, continuing with partial data.');
              }
            }
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
          const { error: advErr } = await supabase.from('brd_documents').update({
            improvements,
            questions,
            risk_analysis: riskAnalysis,
            context_diagram: contextDiagram,
            impacted_components: impactedComponents,
            use_case_scenarios: useCaseScenarios,
            analysis_status: 'completed',
          }).eq('id', documentId);
          if (advErr) send('error', `Advisory save failed: ${advErr.message}`);
          await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'advisory' });

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
          }));
        } else {
           send('status', 'Advisory already completed. Analysis finished.');
           send('complete', JSON.stringify({ documentId }));
        }

        // NOTE: Discovery / optimization / solutions prompts were previously
        // fired here but their results were never persisted — they only burned
        // API credits and kept the function alive past the `complete` event,
        // causing Vercel to kill the idle connection.  Removed intentionally.

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send('error', msg);
        await supabase.from('brd_documents').update({ analysis_status: 'failed' }).eq('id', documentId);
      } finally {
        clearInterval(heartbeat);
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
