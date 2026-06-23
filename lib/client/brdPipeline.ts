export type PipelinePhase = 'idle' | 'parsing' | 'core' | 'advisory' | 'complete' | 'error';

interface PipelineCallbacks {
  onPhase: (phase: PipelinePhase) => void;
  onStatus: (status: string) => void;
}

interface StatusData {
  sections_completed: string[];
  analysis_status: string;
  progress: number;
  message: string;
}

async function getStatus(documentId: string): Promise<StatusData | null> {
  try {
    const res = await fetch(`/api/brd/status?documentId=${documentId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function pollUntilComplete(
  documentId: string,
  requiredSections: string[],
  signal: AbortSignal,
  onStatus: (s: string) => void,
  timeoutMs = 240_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((r) => setTimeout(r, 4_000));
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const status = await getStatus(documentId);
    if (!status) continue;
    onStatus(`Progress: ${status.message} (${status.progress}%)`);
    if (status.analysis_status === 'failed') throw new Error('Analysis failed on server');
    if (requiredSections.every((s) => status.sections_completed.includes(s))) return;
  }
  throw new Error('Timed out waiting for section to complete');
}

export async function runBrdAnalysisPipeline(
  documentId: string,
  signal: AbortSignal,
  { onPhase, onStatus }: PipelineCallbacks
): Promise<void> {
  const post = async (path: string, requiredSections: string[]) => {
    onStatus(`Calling ${path.split('/').pop()}...`);

    let fetchFailed = false;
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
        signal,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.status === 'cached' || data.status === 'completed' || data.status === 'skipped' || data.status === 'extracted') return;
      }
      fetchFailed = true;
    } catch (err) {
      if (signal.aborted) throw err;
      fetchFailed = true;
    }

    if (fetchFailed) {
      onStatus('Request timed out — checking if server completed the step...');
      await pollUntilComplete(documentId, requiredSections, signal, onStatus);
    }
  };

  const status = await getStatus(documentId);
  if (status) onStatus(`Progress: ${status.message} (${status.progress}%)`);

  onStatus('Performing extraction...');
  await post('/api/brd/extract', ['extraction']);

  onPhase('core');
  onStatus('Performing core analysis (features and flow)...');
  await post('/api/brd/core', ['features', 'flow_process']);

  onPhase('advisory');
  onStatus('Performing advisory analysis (improvements, risks, etc.)...');
  await post('/api/brd/advisory', ['improvements', 'questions', 'risk_analysis', 'context_diagram', 'impacted_components', 'use_case_scenarios']);

  onStatus('Performing enrichment analysis (discovery, optimization, solutions)...');
  await post('/api/brd/enrich', ['discovery_questions', 'optimization_suggestions', 'solution_mapping']);
}
