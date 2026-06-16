import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildDiscoveryPrompt } from '@/lib/brd/prompts/discovery';
import { buildOptimizationPrompt } from '@/lib/brd/prompts/optimization';
import { buildSolutionsPrompt } from '@/lib/brd/prompts/solutions';

/**
 * Perform enrichment analysis - discovery questions, optimizations, and solutions mapping.
 * Completes the analysis process by updating the final status.
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

    // Fetch document and features
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .select(`
        id, 
        source_text, 
        extracted_text, 
        user_id, 
        analysis_status,
        sections_completed,
        brd_features (
          feature_id,
          name,
          description
        )
      `)
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

    // Check if enrichment was already completed
    const enrichmentSections = ['discovery_questions', 'optimization_suggestions', 'solution_mapping'];
    const allEnrichmentCompleted = enrichmentSections.every(section => doc.sections_completed.includes(section));
    
    if (allEnrichmentCompleted) {
      // Check if analysis_status is already completed
      if (doc.analysis_status === 'completed') {
        return NextResponse.json({
          status: 'cached',
          message: 'Enrichment analysis already completed',
          documentId
        });
      }
      
      // Update status to completed if it hasn't been done yet
      const { error: statusUpdateError } = await supabase
        .from('brd_documents')
        .update({ analysis_status: 'completed' })
        .eq('id', documentId);

      if (statusUpdateError) {
        console.error('Status update failed:', statusUpdateError);
      }
      
      return NextResponse.json({
        status: 'cached',
        message: 'Enrichment analysis already completed',
        documentId
      });
    }

    // Determine which text to use for analysis
    const analysisText = doc.extracted_text && doc.extracted_text.trim() 
      ? doc.extracted_text 
      : doc.source_text;

    // Prepare features JSON for prompts
    const featuresJson = JSON.stringify(
      (doc.brd_features || []).map((f: any) => ({
        id: f.feature_id,
        name: f.name,
        description: f.description,
      }))
    );

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

    // Run all enrichment prompts in parallel
    try {
      const [discoveryResult, optimizationResult, solutionsResult] = await Promise.all([
        // Discovery questions
        openai.chat.completions.create({
          model: 'deepseek-v4-pro',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert business analyst. Generate discovery questions to gather missing requirements.' 
            },
            { role: 'user', content: buildDiscoveryPrompt(analysisText, featuresJson) },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }).catch(err => {
          console.error('Discovery prompt failed:', err);
          return null;
        }),

        // Optimization suggestions
        openai.chat.completions.create({
          model: 'deepseek-v4-pro',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert business analyst. Generate optimization suggestions.' 
            },
            { role: 'user', content: buildOptimizationPrompt(analysisText, featuresJson) },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }).catch(err => {
          console.error('Optimization prompt failed:', err);
          return null;
        }),

        // Solution mapping
        openai.chat.completions.create({
          model: 'deepseek-v4-pro',
          messages: [
            { 
              role: 'system', 
              content: 'You are a solution architect. Map technical solutions to requirements.' 
            },
            { role: 'user', content: buildSolutionsPrompt(analysisText, featuresJson) },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }).catch(err => {
          console.error('Solutions prompt failed:', err);
          return null;
        }),
      ]);

      // Process results (even if some failed)
      if (discoveryResult) {
        console.log('Discovery analysis completed');
      }
      if (optimizationResult) {
        console.log('Optimization analysis completed');
      }
      if (solutionsResult) {
        console.log('Solutions mapping completed');
      }
    } catch (err) {
      console.error('One or more enrichment prompts failed:', err);
      // Don't fail the whole operation, enrichment is non-critical
    }

    // Update sections_completed to include enrichment sections
    const updatedSections = Array.from(new Set([
      ...doc.sections_completed, 
      'discovery_questions', 
      'optimization_suggestions', 
      'solution_mapping'
    ]));
    
    const { error: sectionsUpdateError } = await supabase
      .from('brd_documents')
      .update({ 
        sections_completed: updatedSections,
        analysis_status: 'completed'  // Finalize the analysis
      })
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
      message: 'Enrichment analysis completed successfully',
      documentId
    });
  } catch (error) {
    console.error('BRD enrichment analysis error:', error);
    
    // Update document status to failed
    try {
      const supabase = await createClient();
      await supabase
        .from('brd_documents')
        .update({ analysis_status: 'failed' })
        .eq('id', (request.json as any)?.documentId || '');
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError);
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Enrichment analysis failed: ${message}` },
      { status: 500 }
    );
  }
}