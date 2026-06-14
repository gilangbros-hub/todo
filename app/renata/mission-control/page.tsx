'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Upload, Play, CloudUpload, AlertCircle, FileText,
  Bell, Settings, ArrowRight, Loader, ExternalLink, Trash2,
} from 'lucide-react';
import { useRenata } from '@/lib/renata/context';
import { getBrdDocuments, deleteBrdDocument } from '@/lib/services/brd';
import { BrdDocument } from '@/lib/types';

const MODELS = [
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', description: 'Comprehensive BRD analysis with gap identification, risk assessment, and enterprise-standard requirement extraction.' },
] as const;

type AnalysisPhase = 'idle' | 'parsing' | 'core' | 'advisory' | 'complete' | 'error';

export default function MissionControlPage() {
  const router = useRouter();
  const { refreshData, setActiveDocument } = useRenata();

  // Input state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [model, setModel] = useState<string>('deepseek-v4-pro');
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
    router.push('/renata/results');
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
    // Vercel Hobby enforces a 4.5 MB function payload limit.
    // Leave 0.5 MB headroom for FormData multipart encoding overhead.
    const maxSize = 4 * 1024 * 1024; // 4 MB
    const allowedTypes = ['application/pdf', 'text/plain'];
    const allowedExtensions = ['.pdf', '.txt'];

    if (file.size > maxSize) {
      return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the 4 MB limit (Vercel serverless payload cap). Please reduce the file size.`;
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

  // Read file as text or parse PDF
  const MAX_TEXT_CHARS = 300_000; // ~600 KB JSON — safely under Vercel's 4.5 MB limit

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

    const form = new FormData();
    form.append('file', selectedFile);
    form.append('fileName', selectedFile.name);

    const res = await fetch('/api/brd/parse-pdf', {
      method: 'POST',
      body: form,
    });

    if (res.status === 413) {
      throw new Error('File is too large for Vercel\'s serverless function limit (4.5 MB). Please reduce the file size below 4 MB and try again.');
    }

    if (!res.ok) {
      let message = 'Failed to parse PDF';
      try {
        const err = await res.json();
        message = err.error || message;
      } catch {
        // Response body is not JSON (e.g. Vercel error page)
      }
      throw new Error(message);
    }

    const data = await res.json();
    // Truncate extracted text to stay under Vercel's payload limit
    return { text: (data.text as string).slice(0, MAX_TEXT_CHARS), fileName: selectedFile.name };
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

      const title = fileName
        ? fileName.replace(/\.(pdf|txt)$/i, '')
        : text.slice(0, 60).split('\n')[0] || 'Untitled Analysis';

      const response = await fetch('/api/brd/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, fileName, model }),
      });

      if (response.status === 413) {
        throw new Error('Document text is too large for analysis. Please reduce the document size and try again.');
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Analysis request failed');
      }

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
        refreshData().then(() => {
          router.push('/renata/results');
        });
        break;
    }
  };

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
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
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

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        {/* Upload Zone (Hero Card) - Spans 8 columns */}
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
              <p className="text-sys-error text-sm font-geist">{error}</p>
            </div>
          )}
        </div>

        {/* LLM Model section */}
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

        {/* Recent Analyses List - Spans full width */}
        <div className="lg:col-span-12 bg-sys-surface border border-sys-border rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-outfit text-xl font-medium text-sys-text">Recent Analyses</h3>
            <button
              onClick={() => router.push('/renata/history')}
              className="text-sys-primary font-geist text-sm font-semibold hover:underline flex items-center gap-1 cursor-pointer">
              View All <ArrowRight size={16} />
            </button>
          </div>
          
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                          doc.analysis_status === 'completed'
                            ? 'bg-sys-success/10 text-sys-success border-sys-success/20'
                            : doc.analysis_status === 'analyzing'
                            ? 'bg-sys-primary-container/10 text-sys-primary border-sys-primary-container/20'
                            : 'bg-sys-error/10 text-sys-error border-sys-error/20'
                        }`}>
                          {doc.analysis_status === 'analyzing' && <Loader size={12} className="animate-spin" />}
                          {doc.analysis_status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-sys-success"></span>}
                          {doc.analysis_status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-sys-error"></span>}
                          {doc.analysis_status === 'completed' ? 'Completed' : doc.analysis_status === 'analyzing' ? 'Processing' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-4 text-sys-muted">
                        {new Date(doc.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
