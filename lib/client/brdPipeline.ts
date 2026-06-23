export type PipelinePhase = 'idle' | 'parsing' | 'core' | 'advisory' | 'complete' | 'error';

interface PipelineCallbacks {
  onPhase: (phase: PipelinePhase) => void;
  onStatus: (status: string) => void;
  onActivity?: () => void;
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
  onActivity?: () => void,
  timeoutMs = 360_000, // 6 minutes max wait for slow LLM calls
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  
  while (Date.now() < deadline) {
    // Always call onActivity FIRST to keep idle timer fresh
    onActivity?.();
    
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((r) => setTimeout(r, 3_000));
    
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    
    try {
      const status = await getStatus(documentId);
      if (status) {
        onStatus(`Progress: ${status.message} (${status.progress}%)`);
        if (status.analysis_status === 'failed') throw new Error('Analysis failed on server');
        if (requiredSections.every((s) => status.sections_completed.includes(s))) return;
      }
    } catch (e) {
      console.warn('Status poll error:', e);
      // Continue polling even if one check fails
    }
  }
  throw new Error('Timed out waiting for section to complete');
}

export async function runBrdAnalysisPipeline(
  documentId: string,
  signal: AbortSignal,
  { onPhase, onStatus, onActivity }: PipelineCallbacks
): Promise<void> {
  const post = async (path: string, requiredSections: string[]) => {
    onStatus(`Calling ${path.split('/').pop()}...`);
    onActivity?.();

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
        if (data.status === 'cached' || data.status === 'completed' || data.status === 'skipped' || data.status === 'extracted') {
          onActivity?.();
          return;
        }
      }
      fetchFailed = true;
    } catch (err) {
      // Check abort FIRST before treating as fetch failure
      if (signal.aborted) throw err;
      fetchFailed = true;
    }

    if (fetchFailed) {
      onStatus('Connection timed out — server may still be working. Retrying in background...');
      await pollUntilComplete(documentId, requiredSections, signal, onStatus, onActivity);
      // After polling succeeds, call onActivity one more time
      onActivity?.();
    }
  };

  const status = await getStatus(documentId);
  if (status) {
    onStatus(`Progress: ${status.message} (${status.progress}%)`);
    onActivity?.();
  }

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
