'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useOracle } from '@/lib/oracle/context';
import { getBrdDocuments, deleteBrdDocument } from '@/lib/services/brd';
import { BrdDocument } from '@/lib/types';

const ParticleBackground = dynamic(
  () => import('@/components/oracle/ParticleBackground').then((mod) => mod.ParticleBackground),
  { ssr: false }
);

type AnalysisPhase = 'idle' | 'parsing' | 'core' | 'advisory' | 'complete' | 'error';

export default function GatehousePage() {
  const router = useRouter();
  const { refreshData, setActiveDocument } = useOracle();

  // Input state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [statusText, setStatusText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  // Document history state
  const [documents, setDocuments] = useState<BrdDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  const hasInput = selectedFile !== null || pasteText.trim().length > 0;

  // Fetch document history on mount
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoadingDocs(true);
      const docs = await getBrdDocuments();
      setDocuments(docs.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle document deletion
  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteBrdDocument(id);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Handle view document
  const handleViewDocument = (doc: BrdDocument) => {
    setActiveDocument(doc);
    router.push('/oracle/codex');
  };

  // Elapsed time counter
  useEffect(() => {
    if (isAnalyzing) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnalyzing]);

  // Auto-scroll reasoning
  useEffect(() => {
    if (reasoningEndRef.current) {
      reasoningEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [reasoning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const phaseLabel = (p: AnalysisPhase) => {
    switch (p) {
      case 'parsing': return 'Parsing Document';
      case 'core': return 'Core Analysis — Extracting Requirements';
      case 'advisory': return 'Advisory Analysis — Risks & Architecture';
      case 'complete': return 'Analysis Complete';
      case 'error': return 'Analysis Failed';
      default: return 'Initializing';
    }
  };

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'text/plain'];
    const allowedExtensions = ['.pdf', '.txt'];

    if (file.size > maxSize) {
      return 'File exceeds 10MB limit. Please use a smaller file.';
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      return 'Only PDF and TXT files are accepted.';
    }

    return null;
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
      setPasteText('');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
      setPasteText('');
    }
  }, []);

  const handlePasteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteText(e.target.value);
    if (e.target.value.trim()) {
      setSelectedFile(null);
    }
    setError(null);
  }, []);

  // Read file as text or parse PDF
  const getDocumentText = async (): Promise<{ text: string; fileName: string | null }> => {
    if (pasteText.trim()) {
      return { text: pasteText.trim(), fileName: null };
    }

    if (!selectedFile) throw new Error('No input provided');

    if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt')) {
      const text = await selectedFile.text();
      return { text, fileName: selectedFile.name };
    }

    // PDF: send to parse-pdf API
    const buffer = await selectedFile.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const res = await fetch('/api/brd/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, fileName: selectedFile.name }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to parse PDF');
    }

    const data = await res.json();
    return { text: data.text, fileName: selectedFile.name };
  };

  // Submit analysis
  const handleSubmit = async () => {
    if (!hasInput || isAnalyzing) return;

    setIsAnalyzing(true);
    setPhase('parsing');
    setStatusText('Reading document...');
    setReasoning('');
    setError(null);

    try {
      const { text, fileName } = await getDocumentText();

      if (text.length < 50) {
        throw new Error('Document is too short. Please provide at least 50 characters of content.');
      }

      setPhase('core');
      setStatusText('Initiating streaming analysis...');

      // Generate title from first line or filename
      const title = fileName
        ? fileName.replace(/\.(pdf|txt)$/i, '')
        : text.slice(0, 60).split('\n')[0] || 'Untitled Analysis';

      // Start streaming analysis
      const response = await fetch('/api/brd/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, fileName }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Analysis request failed');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            handleSSEEvent(currentEvent, data);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            handleSSEEvent(currentEvent, data);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(msg);
      setPhase('error');
      setIsAnalyzing(false);
    }
  };

  const handleSSEEvent = (event: string, data: string) => {
    switch (event) {
      case 'phase':
        if (data === 'core') {
          setPhase('core');
          setStatusText('Core analysis in progress...');
        } else if (data === 'advisory') {
          setPhase('advisory');
          setStatusText('Advisory analysis in progress...');
        }
        break;
      case 'status':
        setStatusText(data);
        break;
      case 'reasoning':
        setReasoning((prev) => prev + data);
        break;
      case 'error':
        setError(data);
        setPhase('error');
        setIsAnalyzing(false);
        break;
      case 'complete':
        setPhase('complete');
        setStatusText('Analysis complete!');
        setIsAnalyzing(false);
        // Refresh context and navigate
        refreshData().then(() => {
          router.push('/oracle/codex');
        });
        break;
    }
  };

  // Render analyzing state
  if (isAnalyzing || phase === 'complete') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative">
        {/* Tactical grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(236,193,79,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(236,193,79,0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 w-full max-w-2xl">
          {/* Pulsing orb animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-oracle-gold/20 animate-pulse flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-oracle-gold/40 animate-ping absolute" />
                <span className="material-symbols-outlined text-oracle-gold text-3xl relative z-10">
                  auto_awesome
                </span>
              </div>
            </div>
          </div>

          {/* Phase and timer */}
          <div className="text-center mb-6">
            <h2 className="font-oracle-display text-oracle-gold text-xl tracking-wide mb-2">
              The Oracle Speaks
            </h2>
            <p className="text-oracle-muted font-oracle-mono text-sm">
              {phaseLabel(phase)}
            </p>
            <p className="text-oracle-faint font-oracle-mono text-xs mt-1">
              Elapsed: {formatTime(elapsedSeconds)}
            </p>
          </div>

          {/* Status text */}
          <div className="text-center mb-6">
            <p className="text-oracle-text/80 text-sm">{statusText}</p>
          </div>

          {/* Reasoning stream */}
          {reasoning && (
            <div className="bg-oracle-stone border border-oracle-border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-oracle-gold text-sm">psychology</span>
                <span className="text-oracle-muted text-xs font-oracle-mono uppercase tracking-wider">
                  Oracle&apos;s Reasoning
                </span>
              </div>
              <p className="text-oracle-text/70 text-xs font-oracle-mono leading-relaxed whitespace-pre-wrap">
                {reasoning}
              </p>
              <div ref={reasoningEndRef} />
            </div>
          )}

          {/* Phase progress indicators */}
          <div className="flex justify-center gap-3 mt-6">
            <PhaseIndicator label="Core" active={phase === 'core'} done={phase === 'advisory' || phase === 'complete'} />
            <PhaseIndicator label="Advisory" active={phase === 'advisory'} done={phase === 'complete'} />
          </div>
        </div>
      </div>
    );
  }

  // Render upload form
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative">
      {/* Particle background */}
      <ParticleBackground density={50} color="rgba(236, 193, 79," speed={1} />

      {/* Tactical grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(236,193,79,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(236,193,79,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        {/* Sword-through-scroll logo */}
        <div className="mb-6">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-oracle-gold">
            {/* Scroll body */}
            <rect x="16" y="18" width="32" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M16 22C16 22 14 22 14 24V44C14 46 16 46 16 46" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M48 22C48 22 50 22 50 24V44C50 46 48 46 48 46" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Scroll lines */}
            <line x1="22" y1="28" x2="42" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1="22" y1="33" x2="42" y2="33" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1="22" y1="38" x2="38" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            {/* Sword through scroll */}
            <line x1="32" y1="4" x2="32" y2="60" stroke="currentColor" strokeWidth="2" />
            <path d="M28 8L32 4L36 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="29" y="52" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.3" />
            <line x1="27" y1="56" x2="37" y2="56" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Hero title */}
        <h1 className="font-oracle-display text-oracle-gold text-3xl sm:text-4xl md:text-oracle-hero tracking-widest text-center mb-2">
          The Oracle
        </h1>

        {/* Subtitle */}
        <p className="font-oracle-mono text-oracle-muted text-xs tracking-[0.3em] uppercase mb-10">
          Tactical Command Interface v2.4
        </p>

        {/* Upload zone card */}
        <div className="w-full bg-oracle-stone border border-oracle-border shadow-oracle-glow rounded-xl p-8 relative">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-oracle-gold/40 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-oracle-gold/40 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-oracle-gold/40 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-oracle-gold/40 rounded-br-xl" />

          {/* Drop zone */}
          <div
            className={`relative bg-oracle-panel border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-oracle-gold bg-oracle-gold/5 shadow-oracle-glow-sm'
                : selectedFile
                ? 'border-oracle-gold/60 bg-oracle-gold/5'
                : 'border-oracle-faint hover:border-oracle-gold/40 hover:bg-oracle-panel/80'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />

            <span className="material-symbols-outlined text-oracle-gold text-4xl mb-3 block">
              drive_folder_upload
            </span>

            {selectedFile ? (
              <>
                <p className="text-oracle-text font-medium mb-1">{selectedFile.name}</p>
                <p className="text-oracle-muted text-sm">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click or drop to replace
                </p>
              </>
            ) : (
              <>
                <p className="text-oracle-text font-medium mb-1">Inscribe Runes</p>
                <p className="text-oracle-muted text-sm">
                  Drop your BRD document here or click to browse
                </p>
                <p className="text-oracle-faint text-xs mt-2">
                  PDF or TXT • Max 10MB
                </p>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-oracle-border" />
            <span className="text-oracle-faint text-xs font-oracle-mono uppercase">or paste text</span>
            <div className="flex-1 h-px bg-oracle-border" />
          </div>

          {/* Text paste area */}
          <textarea
            value={pasteText}
            onChange={handlePasteChange}
            placeholder="Paste your BRD content here..."
            rows={4}
            className="w-full bg-oracle-panel border border-oracle-faint/50 rounded-lg p-4 text-oracle-text text-sm font-oracle-mono placeholder:text-oracle-faint/60 focus:outline-none focus:border-oracle-gold/50 focus:ring-1 focus:ring-oracle-gold/20 resize-none transition-colors"
          />

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-oracle-critical/10 border border-oracle-critical/30 rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-oracle-critical text-sm mt-0.5">error</span>
              <p className="text-oracle-critical text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!hasInput || isAnalyzing}
          className={`mt-6 w-full max-w-xs px-8 py-3 rounded-lg font-oracle-mono text-sm uppercase tracking-wider transition-all duration-200 ${
            hasInput
              ? 'bg-oracle-gold text-oracle-deepest hover:bg-oracle-gold-fixed hover:shadow-oracle-glow cursor-pointer'
              : 'bg-oracle-faint/30 text-oracle-faint cursor-not-allowed'
          }`}
        >
          Initialize Analysis
        </button>

        {/* Previous Analyses Section */}
        <div className="w-full mt-12">
          <h2 className="font-oracle-display text-oracle-gold text-xl tracking-wide mb-4">
            Previous Analyses
          </h2>

          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined text-oracle-gold animate-spin text-2xl">progress_activity</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-oracle-card border border-oracle-border rounded-lg p-6 text-center">
              <span className="material-symbols-outlined text-oracle-faint text-3xl mb-2 block">hourglass_empty</span>
              <p className="text-oracle-muted text-sm">No previous analyses</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-oracle-card border border-oracle-border rounded-lg p-4 hover:border-oracle-gold/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-oracle-text font-medium text-sm truncate">
                        {doc.title}
                      </h3>
                      <p className="text-oracle-muted text-xs font-oracle-mono mt-1">
                        {new Date(doc.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-oracle-mono uppercase tracking-wider ${
                          doc.analysis_status === 'completed'
                            ? 'bg-oracle-low/20 text-oracle-low border border-oracle-low/30'
                            : doc.analysis_status === 'analyzing'
                            ? 'bg-oracle-medium/20 text-oracle-medium border border-oracle-medium/30'
                            : 'bg-oracle-critical/20 text-oracle-critical border border-oracle-critical/30'
                        }`}
                      >
                        {doc.analysis_status}
                      </span>

                      {/* View button */}
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="p-1.5 rounded-md text-oracle-muted hover:text-oracle-gold hover:bg-oracle-gold/10 transition-colors cursor-pointer"
                        title="View analysis"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 rounded-md text-oracle-muted hover:text-oracle-critical hover:bg-oracle-critical/10 transition-colors cursor-pointer"
                        title="Delete analysis"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-10 text-oracle-faint/50 text-xs font-oracle-mono text-center">
          © The Oracle • Tactical Command Interface
        </p>
      </div>
    </div>
  );
}

/** Phase progress indicator dot */
function PhaseIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          done
            ? 'bg-oracle-gold shadow-oracle-glow-sm'
            : active
            ? 'bg-oracle-gold/60 animate-pulse'
            : 'bg-oracle-faint/30'
        }`}
      />
      <span className={`text-xs font-oracle-mono ${done ? 'text-oracle-gold' : active ? 'text-oracle-text' : 'text-oracle-faint'}`}>
        {label}
      </span>
    </div>
  );
}
