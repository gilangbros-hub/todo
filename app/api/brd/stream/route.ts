import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';

const MAX_INPUT_CHARS = 100_000;
export const maxDuration = 300;
export const runtime = 'nodejs';

const ALLOWED_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'];

/**
 * Streaming BRD analysis — sends reasoning tokens in real-time via SSE.
 * The client sees the Oracle "thinking" live, then gets the final result.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, title, fileName, model } = body as {
    text: string;
    title: string;
    fileName: string | null;
    model?: string;
  };

  // Validate
  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }
  if (text.trim().length > MAX_INPUT_CHARS) {
    return new Response(JSON.stringify({ error: 'Text too long' }), { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 500 });
  }

  const selectedModel = model && ALLOWED_MODELS.includes(model) ? model : 'deepseek-v4-pro';
  const trimmedText = text.trim();

  const supabase = await createClient();
  const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey });

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
      send('status', 'Starting core analysis...');

      try {
        // --- Stream Core prompt (features + flow) ---
        send('phase', 'core');
        let coreContent = '';
        let coreReasoning = '';

        const coreStream = await openai.chat.completions.create({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You are an expert business analyst. Respond only with valid JSON.' },
            { role: 'user', content: buildCorePrompt(trimmedText) },
          ],
          temperature: 0.3,
          stream: true,
        });

        for await (const chunk of coreStream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // DeepSeek returns reasoning_content for thinking tokens
          const reasoning = (delta as unknown as { reasoning_content?: string }).reasoning_content;
          if (reasoning) {
            coreReasoning += reasoning;
            send('reasoning', reasoning);
          }

          if (delta.content) {
            coreContent += delta.content;
            // Don't stream raw JSON content — it's not useful to watch
          }
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
            requirement_type: String(f.requirement_type || '').toLowerCase().replace(/-/g, '_').includes('non_functional')
              ? 'non_functional' : 'functional',
            precondition: typeof f.precondition === 'string' ? f.precondition : null,
            postcondition: typeof f.postcondition === 'string' ? f.postcondition : null,
            user_roles: Array.isArray(f.user_roles) ? f.user_roles.filter((r: unknown) => typeof r === 'string') : [],
            impacted_process: typeof f.impacted_process === 'string' ? f.impacted_process : null,
            scope: ['in_scope', 'out_of_scope'].includes(String(f.scope)) ? f.scope : 'unknown',
            accounting_impact: typeof f.accounting_impact === 'string' ? f.accounting_impact : null,
          }));
          await supabase.from('brd_features').insert(featureRows);
        }
        await supabase.rpc('append_section_completed', { doc_id: documentId, section_name: 'features' });

        send('core_done', JSON.stringify({ features, flow_process: flowProcess }));

        // --- Stream Advisory prompt ---
        send('phase', 'advisory');
        send('status', 'Starting advisory analysis...');
        let advisoryContent = '';

        const advisoryStream = await openai.chat.completions.create({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You are an expert business analyst. Respond only with valid JSON.' },
            { role: 'user', content: buildAdvisoryPrompt(trimmedText) },
          ],
          temperature: 0.3,
          stream: true,
        });

        for await (const chunk of advisoryStream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          const reasoning = (delta as unknown as { reasoning_content?: string }).reasoning_content;
          if (reasoning) {
            send('reasoning', reasoning);
          }

          if (delta.content) {
            advisoryContent += delta.content;
          }
        }

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

        const improvements = Array.isArray(advisoryResult.improvements) ? advisoryResult.improvements.slice(0, 15) : [];
        const questions = Array.isArray(advisoryResult.questions) ? advisoryResult.questions.slice(0, 15) : [];
        const riskAnalysis = Array.isArray(advisoryResult.risk_analysis) ? advisoryResult.risk_analysis.slice(0, 15) : [];
        const architectureDiagram = typeof advisoryResult.architecture_diagram === 'string' ? advisoryResult.architecture_diagram : '';
        const impactedSystems = Array.isArray(advisoryResult.impacted_systems) ? advisoryResult.impacted_systems.slice(0, 20) : [];
        const fsdDesign = Array.isArray(advisoryResult.fsd_design) ? advisoryResult.fsd_design.slice(0, 20) : [];

        // Save advisory to DB
        await supabase.from('brd_documents').update({
          improvements,
          questions,
          risk_analysis: riskAnalysis,
          architecture_diagram: architectureDiagram,
          impacted_systems: impactedSystems,
          fsd_design: fsdDesign,
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
          architecture_diagram: architectureDiagram,
          impacted_systems: impactedSystems,
          fsd_design: fsdDesign,
          reasoning: coreReasoning,
        }));

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
