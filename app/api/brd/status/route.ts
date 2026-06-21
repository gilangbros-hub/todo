import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Get the current status of a BRD analysis document.
 * Returns progress information for polling by the client.
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') || searchParams.get('id');

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Valid documentId or id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .select('id, title, user_id, analysis_status, sections_completed, created_at, updated_at')
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

    return NextResponse.json({
      documentId: doc.id,
      title: doc.title,
      analysis_status: doc.analysis_status,
      sections_completed: doc.sections_completed || [],
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      progress: calculateProgress(doc.sections_completed || [], doc.analysis_status),
      message: getStatusMessage(doc.analysis_status, doc.sections_completed || [])
    });
  } catch (error) {
    console.error('BRD status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Status check failed: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Calculate progress percentage based on completed sections
 */
function calculateProgress(sectionsCompleted: string[], analysisStatus: string): number {
  // Define the main analysis phases
  const phases = [
    'extraction',      // Extraction phase
    'features',        // Core features
    'flow_process',    // Core flow process
    'improvements',    // Advisory improvements
    'questions',       // Advisory questions
    'risk_analysis',   // Advisory risk analysis
    'context_diagram', // Advisory context diagram
    'impacted_components', // Advisory impacted components
    'use_case_scenarios',  // Advisory use case scenarios
    'discovery_questions',    // Enrichment discovery
    'optimization_suggestions', // Enrichment optimization
    'solution_mapping'   // Enrichment solutions
  ];

  // Calculate based on required sections
  const requiredPhases = [
    'extraction',
    'features', 
    'flow_process',
    'improvements',
    'questions',
    'risk_analysis',
    'context_diagram',
    'impacted_components',
    'use_case_scenarios',
    'discovery_questions',
    'optimization_suggestions',
    'solution_mapping'
  ];

  if (analysisStatus === 'completed') {
    return 100;
  }

  if (analysisStatus === 'failed') {
    return 0;
  }

  const completedRequired = requiredPhases.filter(phase => sectionsCompleted.includes(phase)).length;
  const totalRequired = requiredPhases.length;
  
  return Math.round((completedRequired / totalRequired) * 100);
}

/**
 * Generate a human-readable status message
 */
function getStatusMessage(analysisStatus: string, sectionsCompleted: string[]): string {
  if (analysisStatus === 'failed') {
    return 'Analysis failed';
  }
  
  if (analysisStatus === 'completed') {
    return 'Analysis completed';
  }

  // Determine current phase based on completed sections
  if (sectionsCompleted.includes('extraction')) {
    if (sectionsCompleted.includes('features') && sectionsCompleted.includes('flow_process')) {
      if (sectionsCompleted.includes('improvements') && sectionsCompleted.includes('questions')) {
        if (sectionsCompleted.includes('discovery_questions')) {
          return 'Processing enrichment analysis';
        }
        return 'Processing advisory analysis';
      }
      return 'Processing advisory analysis';
    }
    return 'Processing core analysis';
  }

  return 'Initializing analysis';
}