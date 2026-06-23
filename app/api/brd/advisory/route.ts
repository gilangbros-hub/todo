import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildAdvisoryPrompt } from '@/lib/brd/prompts/advisory';
import { sanitizeMermaid } from '@/lib/brd/mermaid';

export const maxDuration = 300;

/**
 * Perform advisory BRD analysis - generate improvements, questions, risks, etc.
 * Updates the document with advisory analysis results.
 */
export async function POST(request: NextRequest) {
  let documentId: string | undefined;
  try {
    const body = await request.json();
    const parsed = body as { documentId: string };
    documentId = parsed.documentId;

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Valid documentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .select('id, source_text, extracted_text, user_id, sections_completed')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Failed to fetch document:', docError);
      return NextResponse.json(
        { error: `Document not found: ${docError.message}` },
        { status: 404 }
      );
    }

    // Check if user owns this document
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== doc.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized: Access denied to this document' },
        { status: 403 }
      );
    }

    // Check if advisory analysis was already completed
    const advisorySections = ['improvements', 'questions', 'risk_analysis', 'context_diagram', 'impacted_components', 'use_case_scenarios'];
    const allAdvisoryCompleted = advisorySections.every(section => doc.sections_completed.includes(section));
    
    if (allAdvisoryCompleted) {
      return NextResponse.json({
        status: 'cached',
        message: 'Advisory analysis already completed',
        documentId,
        improvements: [],
        questions: [],
        risk_analysis: [],
        context_diagram: '',
        impacted_components: [],
        use_case_scenarios: []
      });
    }

    // Determine which text to use for analysis
    const analysisText = doc.extracted_text && doc.extracted_text.trim() 
      ? doc.extracted_text 
      : doc.source_text;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing DeepSeek API key' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });

    // Run advisory analysis
    const completion = await openai.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.' 
        },
        { role: 'user', content: buildAdvisoryPrompt(analysisText) },
      ],
      temperature: 0.3,
      max_tokens: 16384, // Ensure we get full response
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Clean and parse the response
    const cleaned = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error('Advisory JSON parse failed:', e);
      console.error('Raw response:', responseText);
      return NextResponse.json(
        { error: `Advisory analysis response could not be parsed: ${(e as Error).message}` },
        { status: 500 }
      );
    }

    const improvements = Array.isArray(result.IMPROVEMENTS) ? result.IMPROVEMENTS.slice(0, 15) : [];
    const questions = Array.isArray(result.QUESTIONS) ? result.QUESTIONS.slice(0, 15) : [];
    const riskAnalysis = Array.isArray(result.RISK_ANALYSIS) ? result.RISK_ANALYSIS.slice(0, 15) : [];
    const contextDiagram = typeof result.CONTEXT_DIAGRAM === 'string' 
      ? sanitizeMermaid(result.CONTEXT_DIAGRAM)
      : '';
    const impactedComponents = Array.isArray(result.IMPACTED_COMPONENTS) ? result.IMPACTED_COMPONENTS.slice(0, 20) : [];
    const useCaseScenarios = Array.isArray(result.USE_CASE_SCENARIOS) ? result.USE_CASE_SCENARIOS.slice(0, 20) : [];

    // Update document with advisory results
    const { error: updateError } = await supabase
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

    if (updateError) {
      console.error('Advisory data update failed:', updateError);
      return NextResponse.json(
        { error: `Failed to update advisory data: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Update sections_completed to include all advisory sections
    const updatedSections = Array.from(new Set([
      ...doc.sections_completed, 
      'improvements', 
      'questions', 
      'risk_analysis', 
      'context_diagram', 
      'impacted_components', 
      'use_case_scenarios'
    ]));
    
    const { error: sectionsUpdateError } = await supabase
      .from('brd_documents')
      .update({ sections_completed: updatedSections })
      .eq('id', documentId);

    if (sectionsUpdateError) {
      console.error('Sections update failed:', sectionsUpdateError);
      return NextResponse.json(
        { error: `Failed to update sections completed: ${sectionsUpdateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'completed',
      message: 'Advisory analysis completed successfully',
      documentId,
      improvements,
      questions,
      risk_analysis: riskAnalysis,
      context_diagram: contextDiagram,
      impacted_components: impactedComponents,
      use_case_scenarios: useCaseScenarios
    });
  } catch (error) {
    console.error('BRD advisory analysis error:', error);
    
    // Update document status to failed
    try {
      if (documentId) {
        const supabase = await createClient();
        await supabase
          .from('brd_documents')
          .update({ analysis_status: 'failed' })
          .eq('id', documentId);
      }
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError);
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Advisory analysis failed: ${message}` },
      { status: 500 }
    );
  }
}