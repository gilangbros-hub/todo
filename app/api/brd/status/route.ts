import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  calculateAnalysisProgress,
  getAnalysisStatusMessage,
} from '@/lib/brd/progress';

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
      progress: calculateAnalysisProgress(doc.sections_completed || [], doc.analysis_status),
      message: getAnalysisStatusMessage(doc.analysis_status, doc.sections_completed || [])
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