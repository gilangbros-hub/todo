/**
 * BRD Oracle — Data access layer for BRD documents and features.
 */

import { supabase } from '@/lib/supabase';
import { BrdDocument, BrdFeature } from '@/lib/types';
import { ValidatedFeature, FlowStep, RiskItem } from '@/lib/brd/prompt';

interface AnalysisExtras {
  flow_process: FlowStep[];
  improvements: string[];
  questions: string[];
  risk_analysis: RiskItem[];
}

/**
 * Save a BRD analysis: creates the document record and all extracted features.
 */
export async function saveBrdAnalysis(
  title: string,
  sourceText: string,
  fileName: string | null,
  features: ValidatedFeature[],
  extras?: AnalysisExtras
): Promise<{ document: BrdDocument; features: BrdFeature[] }> {
  // 1. Insert the document
  const { data: doc, error: docError } = await supabase
    .from('brd_documents')
    .insert({
      title,
      source_text: sourceText,
      file_name: fileName,
      flow_process: extras?.flow_process || [],
      improvements: extras?.improvements || [],
      questions: extras?.questions || [],
      risk_analysis: extras?.risk_analysis || [],
    })
    .select()
    .single();

  if (docError) {
    throw new Error(`Failed to save BRD document: ${docError.message}`);
  }

  // 2. Insert all features linked to the document
  const featureRows = features.map((f) => ({
    document_id: doc.id,
    name: f.name,
    description: f.description,
    pilot_status: f.pilot_status,
    retention: f.retention,
    business_flow: f.business_flow,
    as_is: f.as_is,
    to_be: f.to_be,
    risks: f.risks,
    suggested_priority: f.suggested_priority,
    requirement_type: f.requirement_type || 'functional',
    precondition: f.precondition,
    postcondition: f.postcondition,
    user_roles: f.user_roles || [],
    impacted_process: f.impacted_process,
    scope: f.scope || 'unknown',
    accounting_impact: f.accounting_impact,
  }));

  const { data: savedFeatures, error: featError } = await supabase
    .from('brd_features')
    .insert(featureRows)
    .select();

  if (featError) {
    throw new Error(`Failed to save BRD features: ${featError.message}`);
  }

  return { document: doc as BrdDocument, features: savedFeatures as BrdFeature[] };
}

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
