/**
 * BRD Analysis — Data access layer for BRD documents and features.
 */

import { supabase } from '@/lib/supabase';
import { BrdDocument, BrdFeature } from '@/lib/types';
// saveBrdAnalysis removed as it's not used and references obsolete schema

/**
 * Mark a BRD analysis as failed/cancelled (for stuck or killed analyses).
 */
export async function cancelBrdAnalysis(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('brd_documents')
    .update({ analysis_status: 'failed' })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to cancel analysis: ${error.message}`);
  }
}

/**
 * Fetch all BRD documents for the current user (most recent first).
 */
export async function getBrdDocuments(): Promise<BrdDocument[]> {
  const { data, error } = await supabase
    .from('brd_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch BRD documents: ${error.message}`);
  }

  return data as BrdDocument[];
}

/**
 * Fetch a single BRD document by ID.
 */
export async function getBrdDocumentById(documentId: string): Promise<BrdDocument> {
  const { data, error } = await supabase
    .from('brd_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch BRD document: ${error.message}`);
  }

  return data as BrdDocument;
}

/**
 * Fetch all features for a specific BRD document.
 */
export async function getBrdFeatures(documentId: string): Promise<BrdFeature[]> {
  const { data, error } = await supabase
    .from('brd_features')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch BRD features: ${error.message}`);
  }

  return data as BrdFeature[];
}

/**
 * Delete a BRD document (cascades to features).
 */
export async function deleteBrdDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('brd_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete BRD document: ${error.message}`);
  }
}
