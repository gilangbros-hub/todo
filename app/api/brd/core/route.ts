import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildCorePrompt } from '@/lib/brd/prompts/core';

/**
 * Perform core BRD analysis - extract features and flow process.
 * Updates the document with features (saved to brd_features table) and flow_process.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId } = body as {
      documentId: string;
    };

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

    // Check if core analysis was already completed
    if (doc.sections_completed.includes('features') && doc.sections_completed.includes('flow_process')) {
      return NextResponse.json({
        status: 'cached',
        message: 'Core analysis already completed',
        documentId,
        features: [],
        flow_process: []
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

    // Run core analysis
    const completion = await openai.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.' 
        },
        { role: 'user', content: buildCorePrompt(analysisText) },
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

    let result: { features?: unknown[]; flow_process?: unknown[] } = { features: [], flow_process: [] };
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error('Core JSON parse failed:', e);
      console.error('Raw response:', responseText);
      return NextResponse.json(
        { error: `Core analysis response could not be parsed: ${(e as Error).message}` },
        { status: 500 }
      );
    }

    const features = Array.isArray(result.features) ? result.features.slice(0, 20) : [];
    const flowProcess = Array.isArray(result.flow_process) ? result.flow_process : [];

    // Update flow_process in brd_documents
    const { error: flowUpdateError } = await supabase
      .from('brd_documents')
      .update({ flow_process: flowProcess })
      .eq('id', documentId);

    if (flowUpdateError) {
      console.error('Flow update failed:', flowUpdateError);
      return NextResponse.json(
        { error: `Failed to update flow process: ${flowUpdateError.message}` },
        { status: 500 }
      );
    }

    // Insert features into brd_features table
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

      const { error: featuresInsertError } = await supabase
        .from('brd_features')
        .insert(featureRows);

      if (featuresInsertError) {
        console.error('Feature insert failed:', featuresInsertError);
        return NextResponse.json(
          { error: `Failed to insert features: ${featuresInsertError.message}` },
          { status: 500 }
        );
      }
    }

    // Update sections_completed to include features and flow_process
    const updatedSections = Array.from(new Set([...doc.sections_completed, 'features', 'flow_process']));
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
      message: 'Core analysis completed successfully',
      documentId,
      features,
      flow_process: flowProcess
    });
  } catch (error) {
    console.error('BRD core analysis error:', error);
    
    // Update document status to failed
    try {
      const supabase = await createClient();
      await supabase
        .from('brd_documents')
        .update({ analysis_status: 'failed' })
        .eq('id', documentId);
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError);
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Core analysis failed: ${message}` },
      { status: 500 }
    );
  }
}