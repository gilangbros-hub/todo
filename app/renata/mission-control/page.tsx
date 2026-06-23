'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Brain, Upload, Play, CloudUpload, AlertCircle, FileText,
  Bell, Settings, ArrowRight, Loader, ExternalLink, Trash2,
  Square, RotateCcw,
} from 'lucide-react';
import { useRenata } from '@/lib/renata/context';
import { parsePdfWithSplit } from '@/lib/client/pdf';
import { useBrdDocuments } from '@/lib/hooks/useBrdDocuments';
import { StatusBadge } from '@/components/renata/StatusBadge';
import { runBrdAnalysisPipeline } from '@/lib/client/brdPipeline';
import { cancelBrdAnalysis, getBrdDocumentById } from '@/lib/services/brd';

const MODELS = [
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', description: 'Comprehensive BRD analysis with gap identification, risk assessment, and enterprise-standard requirement extraction.' },
] as const;

type AnalysisPhase = 'idle' | 'parsing' | 'core' | 'advisory' | 'complete' | 'error';

const TOTAL_TIMEOUT_MS = 5 * 60 * 1000;
const IDLE_TIMEOUT_MS = 25_000;

function MissionControlInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshData, setActiveDocument } = useRenata();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [model, setModel] = useState<string>('deepseek-v4-pro');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [statusText, setStatusText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resumeDocumentId, setResumeDocumentId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  const abortRef = useRef<AbortController | null>(null);
  const activeDocumentIdRef = useRef<string | null>(null);
  const lastDataRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { documents, isLoading: isLoadingDocs, error: historyError, handleDelete: handleDeleteDocument, handleView: handleViewDocument } = useBrdDocuments({ limit: 5 });

  const hasInput = selectedFile !== null || pasteText.trim().length > 0;

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

  useEffect(() => {
    if (reasoningEndRef.current) {
      reasoningEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [reasoning]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

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

  const validateFile = (file: File): string | null => {
    const maxSize = 25 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'text/plain'];
    const allowedExtensions = ['.pdf', '.txt'];

    if (file.size > maxSize) {
      return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the 25 MB limit. Please reduce the file size.`;
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      return 'Only PDF and TXT files are accepted.';
    }

    return null;
  };

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

  const MAX_TEXT_CHARS = 300_000;

  const getDocumentText = async (): Promise<{ text: string; fileName: string | null }> => {
    if (pasteText.trim()) {
      const text = pasteText.trim().slice(0, MAX_TEXT_CHARS);
      return { text, fileName: null };
    }

    if (!selectedFile) throw new Error('No input provided');

    if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt')) {
      const raw = await selectedFile.text();
      return { text: raw.slice(0, MAX_TEXT_CHARS), fileName: selectedFile.name };
    }

    return parsePdfWithSplit(selectedFile, (msg) => setStatusText(msg));
  };

  const makeAbortSetup = () => {
    const abort = new AbortController();
    abortRef.current = abort;
    lastDataRef.current = Date.now();

    const totalTimer = setTimeout(() => abort.abort(), TOTAL_TIMEOUT_MS);

    idleTimerRef.current = setInterval(() => {
      if (Date.now() - lastDataRef.current > IDLE_TIMEOUT_MS) {
        abort.abort();
      }
    }, 5_000);

    const cleanup = () => {
      clearTimeout(totalTimer);
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      abortRef.current = null;
    };

    return { abort, cleanup };
  };

  const handleStop = useCallback(() => {
    const docId = activeDocumentIdRef.current;
    abortRef.current?.abort();
    if (docId) {
      cancelBrdAnalysis(docId).catch(() => {});
    }
  }, []);

  const handleSubmit = async () => {
    if (!hasInput || isAnalyzing) return;

    const { abort, cleanup } = makeAbortSetup();

    setIsAnalyzing(true);
    setPhase('parsing');
    setStatusText('Reading document...');
    setReasoning('');
    setError(null);
    setResumeDocumentId(null);

    try {
      const { text, fileName } = await getDocumentText();

      if (text.length < 50) {
        throw new Error('Document is too short. Please provide at least 50 characters of content.');
      }

      setPhase('core');
      setStatusText('Initiating streaming analysis...');

      const title = fileName
        ? fileName.replace(/\.(pdf|txt)$/i, '')
        : text.slice(0, 60).split('\n')[0] || 'Untitled Analysis';

      setStatusText('Initializing analysis...');
      const initResponse = await fetch('/api/brd/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, fileName, model }),
        signal: abort.signal,
      });

      if (!initResponse.ok) {
        const initErr = await initResponse.json();
        throw new Error(initErr.error || 'Failed to initialize analysis');
      }

      const { documentId } = await initResponse.json();
      activeDocumentIdRef.current = documentId;
      setResumeDocumentId(documentId);

      await runBrdAnalysisPipeline(documentId, abort.signal, {
        onPhase: (p) => setPhase(p as AnalysisPhase),
        onStatus: setStatusText,
        onActivity: () => {
          lastDataRef.current = Date.now();
        },
      });

      setStatusText('Analysis complete! Refreshing data...');
      await refreshData();
      router.push('/renata/results');
    } catch (err) {
      if (abort.signal.aborted) {
        setError('Analysis was stopped. Any saved progress is available in your history.');
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(msg);
      }
      setPhase('error');
      setIsAnalyzing(false);
    } finally {
      cleanup();
    }
  };

  const handleResume = useCallback(async (documentId: string) => {
    if (isAnalyzing) return;

    const { abort, cleanup } = makeAbortSetup();

    activeDocumentIdRef.current = documentId;
    setResumeDocumentId(documentId);
    setIsAnalyzing(true);
    setPhase('core');
    setStatusText('Resuming analysis...');
    setReasoning('');
    setError(null);

    try {
      await runBrdAnalysisPipeline(documentId, abort.signal, {
        onPhase: (p) => setPhase(p as AnalysisPhase),
        onStatus: setStatusText,
        onActivity: () => {
          lastDataRef.current = Date.now();
        },
      });

      setStatusText('Analysis complete! Refreshing data...');
      const doc = await getBrdDocumentById(documentId);
      setActiveDocument(doc);
      await refreshData();
      router.push('/renata/results');
    } catch (err) {
      if (abort.signal.aborted) {
        setError('Analysis was stopped. Any saved progress is available in your history.');
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(msg);
      }
      setPhase('error');
      setIsAnalyzing(false);
    } finally {
      cleanup();
    }
  }, [isAnalyzing, refreshData, router, setActiveDocument]);

  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (resumeId && !isAnalyzing) {
      handleResume(resumeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isAnalyzing || phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-[80vh] relative">
        <div className="relative z-10 w-full max-w-2xl bg-sys-surface rounded-3xl border border-sys-border shadow-sm p-10">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-sys-primary-container/30 animate-pulse flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-sys-primary/20 animate-ping absolute" />
                <Brain size={32} className="text-sys-primary relative z-10" />
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="font-outfit font-semibold text-sys-primary text-2xl tracking-tight mb-2">
              Renata Processing
            </h2>
            <p className="text-sys-muted font-geist font-medium text-sm">
              {phaseLabel(phase)}
            </p>
            <p className="text-sys-faint font-geist text-xs mt-1">
              Elapsed: {formatTime(elapsedSeconds)}
            </p>
          </div>

          <div className="text-center mb-6">
            <p className="text-sys-text/80 text-sm font-geist">{statusText}</p>
          </div>

          {reasoning && (
            <div className="bg-sys-bg border border-sys-border rounded-xl p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={16} className="text-sys-primary" />
                <span className="text-sys-muted text-xs font-geist uppercase tracking-wider font-semibold">
                  AI Reasoning
                </span>
              </div>
              <p className="text-sys-text/70 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {reasoning}
              </p>
              <div ref={reasoningEndRef} />
            </div>
          )}

          {isAnalyzing && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleStop}
                className="px-5 py-2 bg-sys-error/10 border border-sys-error/30 text-sys-error rounded-xl font-geist text-sm font-medium hover:bg-sys-error/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Square size={14} />
                Stop Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-outfit text-3xl font-bold text-sys-text tracking-tight">Welcome back, Gilang.</h2>
          <p className="font-geist text-base text-sys-muted mt-2">Upload your Business Requirements Document to begin analysis.</p>
        </div>
        <div className="hidden sm:flex gap-4">
          <button className="p-2 rounded-full bg-sys-surface border border-sys-border hover:bg-sys-bg transition-colors text-sys-muted">
            <Bell size={20} />
          </button>
          <button className="p-2 rounded-full bg-sys-surface border border-sys-border hover:bg-sys-bg transition-colors text-sys-muted">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        <div className="lg:col-span-8 bg-sys-surface border border-sys-border rounded-3xl p-8 relative overflow-hidden group hover:border-sys-primary-container transition-all duration-300 shadow-sm flex flex-col justify-center">
          <div className="absolute inset-0 shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div 
            className={`relative flex flex-col items-center justify-center py-16 px-8 text-center h-full min-h-[320px] border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${
              isDragOver ? 'border-sys-primary bg-sys-primary/5' : 'border-sys-border bg-sys-bg/50'
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
            
            <div className="w-20 h-20 rounded-full bg-sys-primary-container/20 flex items-center justify-center mb-6 text-sys-primary group-hover:scale-110 transition-transform duration-300">
              <Upload size={40} />
            </div>
            
            {selectedFile ? (
              <>
                <h3 className="font-outfit text-xl font-medium text-sys-text mb-2">{selectedFile.name}</h3>
                <p className="font-geist text-sys-muted mb-8 max-w-md">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace
                </p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmit();
                  }}
                  className="px-8 py-3 bg-sys-primary text-white rounded-xl font-geist text-sm font-semibold flex items-center gap-2 hover:bg-sys-primary/90 transition-all shadow-sm cursor-pointer z-10"
                >
                  <Play size={18} />
                  Start Analysis
                </button>
              </>
            ) : (
              <>
                <h3 className="font-outfit text-xl font-medium text-sys-text mb-2">Drag & Drop BRD Document</h3>
                <p className="font-geist text-sys-muted mb-8 max-w-md">Supported formats: PDF, DOCX, TXT. Renata will automatically extract requirements, identify gaps, and generate process models.</p>
                <button className="px-6 py-3 bg-sys-primary text-white rounded-xl font-geist text-sm font-semibold flex items-center gap-2 hover:bg-sys-primary/90 transition-all shadow-sm">
                  <CloudUpload size={18} />
                  Select File
                </button>
              </>
            )}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-sys-error/10 border border-sys-error/30 rounded-lg flex items-start gap-2 relative z-10">
              <AlertCircle size={16} className="text-sys-error shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sys-error text-sm font-geist">{error}</p>
                {resumeDocumentId && (
                  <button
                    onClick={() => handleResume(resumeDocumentId)}
                    className="mt-2 flex items-center gap-1.5 text-sys-error text-sm font-geist font-semibold hover:underline cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Resume Analysis
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-sys-surface border border-sys-border rounded-3xl p-5 flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={20} className="text-sys-primary" />
            <h3 className="font-outfit text-lg font-medium text-sys-text">LLM Model</h3>
          </div>
          <div className="flex-1 bg-sys-bg border border-sys-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-sys-success"></div>
              <div>
                <span className="font-geist text-sm font-semibold text-sys-text block">DeepSeek V4 Pro</span>
                <span className="font-geist text-xs text-sys-muted leading-tight">Comprehensive BRD analysis with gap identification and enterprise standards.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 bg-sys-surface border border-sys-border rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-outfit text-xl font-medium text-sys-text">Recent Analyses</h3>
            <button
              onClick={() => router.push('/renata/history')}
              className="text-sys-primary font-geist text-sm font-semibold hover:underline flex items-center gap-1 cursor-pointer">
              View All <ArrowRight size={16} />
            </button>
          </div>
          
          {historyError && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-sys-error/10 border border-sys-error/20 rounded-xl text-sys-error text-sm font-geist">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{historyError}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-sys-border text-sys-muted font-geist text-sm">
                  <th className="pb-4 pl-2 font-medium">Project Name</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Date Analysed</th>
                  <th className="pb-4 pr-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm font-geist">
                {isLoadingDocs ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sys-muted">
                      <Loader size={24} className="animate-spin text-sys-muted" />
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sys-muted">
                      No previous analyses found.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-sys-border hover:bg-sys-bg transition-colors group">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sys-bg flex items-center justify-center text-sys-muted border border-sys-border">
                            <FileText size={20} />
                          </div>
                          <div>
                            <span className="block text-sys-text font-medium">{doc.title}</span>
                            <span className="text-sys-muted text-xs">{(doc.source_text?.length || 0) > 1000 ? Math.floor(doc.source_text.length/1024) + ' KB' : 'Snippet'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <StatusBadge status={doc.analysis_status} />
                      </td>
                      <td className="py-4 text-sys-muted">
                        {new Date(doc.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(doc.analysis_status === 'failed' || doc.analysis_status === 'analyzing') && (
                            <button 
                              onClick={() => handleResume(doc.id)}
                              className="p-2 text-sys-muted hover:text-sys-warning transition-colors cursor-pointer"
                              title="Resume Analysis"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewDocument(doc)}
                            className="p-2 text-sys-muted hover:text-sys-primary transition-colors cursor-pointer"
                            title="View Analysis"
                          >
                            <ExternalLink size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-sys-muted hover:text-sys-error transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MissionControlPage() {
  return (
    <Suspense fallback={null}>
      <MissionControlInner />
    </Suspense>
  );
}
