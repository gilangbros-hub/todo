export type PipelinePhase = 'idle' | 'parsing' | 'core' | 'advisory' | 'complete' | 'error';

interface PipelineCallbacks {
  onPhase: (phase: PipelinePhase) => void;
  onStatus: (status: string) => void;
}

async function pollStatus(
  documentId: string,
  onStatus: (status: string) => void
): Promise<void> {
  const res = await fetch(`/api/brd/status?documentId=${documentId}`);
  if (!res.ok) return;
  const data = await res.json();
  onStatus(`Progress: ${data.message} (${data.progress}%)`);
}

export async function runBrdAnalysisPipeline(
  documentId: string,
  signal: AbortSignal,
  { onPhase, onStatus }: PipelineCallbacks
): Promise<void> {
  const post = async (path: string) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `${path} failed`);
    }
    return res;
  };

  onStatus('Performing extraction...');
  await pollStatus(documentId, onStatus);
  await post('/api/brd/extract');

  onPhase('core');
  onStatus('Performing core analysis (features and flow)...');
  await pollStatus(documentId, onStatus);
  await post('/api/brd/core');

  onPhase('advisory');
  onStatus('Performing advisory analysis (improvements, risks, etc.)...');
  await pollStatus(documentId, onStatus);
  await post('/api/brd/advisory');

  onStatus('Performing enrichment analysis (discovery, optimization, solutions)...');
  await pollStatus(documentId, onStatus);
  await post('/api/brd/enrich');
}
