export const REQUIRED_PIPELINE_SECTIONS = [
  'chunk_extraction',
  'features',
  'flow_process',
  'advisory',
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

  if (sectionsCompleted.includes('chunk_extraction')) {
    if (
      sectionsCompleted.includes('features') &&
      sectionsCompleted.includes('flow_process')
    ) {
      return 'Processing advisory analysis';
    }
    return 'Processing core analysis';
  }

  return 'Initializing analysis';
}

export function isAnalysisFullyComplete(sectionsCompleted: string[]): boolean {
  return REQUIRED_PIPELINE_SECTIONS.every((s) => sectionsCompleted.includes(s));
}
