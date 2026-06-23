export const REQUIRED_PIPELINE_SECTIONS = [
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
  'solution_mapping',
] as const;

export function calculateAnalysisProgress(
  sectionsCompleted: string[],
  analysisStatus: string
): number {
  if (analysisStatus === 'completed') return 100;

  const completed = REQUIRED_PIPELINE_SECTIONS.filter((s) =>
    sectionsCompleted.includes(s)
  ).length;

  return Math.round((completed / REQUIRED_PIPELINE_SECTIONS.length) * 100);
}

export function getAnalysisStatusMessage(
  analysisStatus: string,
  sectionsCompleted: string[]
): string {
  if (analysisStatus === 'failed') return 'Analysis failed';
  if (analysisStatus === 'completed') return 'Analysis completed';

  if (sectionsCompleted.includes('extraction')) {
    if (
      sectionsCompleted.includes('features') &&
      sectionsCompleted.includes('flow_process')
    ) {
      if (
        sectionsCompleted.includes('improvements') &&
        sectionsCompleted.includes('questions')
      ) {
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

export function isAnalysisFullyComplete(sectionsCompleted: string[]): boolean {
  return REQUIRED_PIPELINE_SECTIONS.every((s) => sectionsCompleted.includes(s));
}
