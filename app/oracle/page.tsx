'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PlayerStats, BrdDocument, BrdFeature } from '@/lib/types';
import { getPlayerStats } from '@/lib/services/player-stats';
import { getBrdDocuments, getBrdFeatures, deleteBrdDocument, cancelBrdAnalysis } from '@/lib/services/brd';
import { RiskItem, FlowStep } from '@/lib/brd/prompt';
import { useBrdRealtime } from '@/lib/hooks/useBrdRealtime';
import Sidebar from '@/components/Sidebar';
import ScrollInput from '@/components/ScrollInput';
import ProphecyCard from '@/components/ProphecyCard';
import OracleLoading from '@/components/OracleLoading';
import MermaidDiagram from '@/components/MermaidDiagram';

type ViewState = 'input' | 'analyzing' | 'results' | 'history';

interface ImprovementItem {
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface QuestionItem {
  question: string;
  context: string;
  category: string;
  target_role: string;
}

interface ImpactedSystem {
  system_name: string;
  description: string;
  impact_type: string;
}

interface FsdDesignItem {
  feature_name: string;
  explanation: string;
  user_action: string;
  system_reaction: string;
}

interface AnalysisExtras {
  flow_process: FlowStep[];
  improvements: ImprovementItem[];
  questions: QuestionItem[];
  risk_analysis: RiskItem[];
  architecture_diagram: string;
  impacted_systems: ImpactedSystem[];
  fsd_design: FsdDesignItem[];
}

// Risk impact → visual styles mapping (single source of truth)
function getImpactStyles(impact: RiskItem['impact']): { borderColor: string; badgeClass: string } {
  switch (impact) {
    case 'critical': return { borderColor: '#f43f5e', badgeClass: 'bg-red-500/20 text-red-400' };
    case 'high': return { borderColor: '#f97316', badgeClass: 'bg-orange-500/20 text-orange-400' };
    case 'medium': return { borderColor: '#eab308', badgeClass: 'bg-yellow-500/20 text-yellow-400' };
    default: return { borderColor: '#22c55e', badgeClass: 'bg-green-500/20 text-green-400' };
  }
}

export default function OraclePage() {
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: '', user_id: '', xp: 0, level: 1, streak: 0, last_completed_date: null,
  });
  const [viewState, setViewState] = useState<ViewState>('input');
  const [features, setFeatures] = useState<BrdFeature[]>([]);
  const [documents, setDocuments] = useState<BrdDocument[]>([]);
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawModal, setShowRawModal] = useState(false);
  const [streamReasoning, setStreamReasoning] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const [streamPhase, setStreamPhase] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [previousView, setPreviousView] = useState<ViewState>('input');
  const [analysisStartTime, setAnalysisStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const viewStateRef = useRef(viewState);
  viewStateRef.current = viewState;
  const abortControllerRef = useRef<AbortController | null>(null);
  const [extras, setExtras] = useState<AnalysisExtras>({
    flow_process: [],
    improvements: [],
    questions: [],
    risk_analysis: [],
    architecture_diagram: '',
    impacted_systems: [],
    fsd_design: [],
  });

  // Real-time subscription — progressively fills sections as the backend completes them
  const { document: liveDoc, sectionsReady } = useBrdRealtime(isAnalyzing ? currentDocId : null);

  // When live document updates, merge new sections into the UI
  useEffect(() => {
    if (!liveDoc) return;
    setExtras((prev) => ({
      flow_process: (liveDoc.flow_process?.length ? liveDoc.flow_process : prev.flow_process) as FlowStep[],
      improvements: (liveDoc.improvements?.length ? liveDoc.improvements : prev.improvements) as ImprovementItem[],
      questions: (liveDoc.questions?.length ? liveDoc.questions : prev.questions) as QuestionItem[],
      risk_analysis: (liveDoc.risk_analysis?.length ? liveDoc.risk_analysis : prev.risk_analysis) as RiskItem[],
      architecture_diagram: liveDoc.architecture_diagram || prev.architecture_diagram,
      impacted_systems: (liveDoc.impacted_systems?.length ? liveDoc.impacted_systems : prev.impacted_systems) as ImpactedSystem[],
      fsd_design: (liveDoc.fsd_design?.length ? liveDoc.fsd_design : prev.fsd_design) as FsdDesignItem[],
    }));

    // Load features as soon as the features section is ready
    if (sectionsReady.includes('features') && currentDocId) {
      getBrdFeatures(currentDocId).then((feats) => {
        if (feats.length > 0) setFeatures(feats);
      }).catch(console.error);
    }

    // When fully complete, flip out of analyzing state
    if (liveDoc.analysis_status === 'completed') {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      if (viewStateRef.current === 'analyzing') {
        setViewState('results');
        setAnalysisComplete(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveDoc, sectionsReady]);

  // Fetch player stats
  useEffect(() => {
    getPlayerStats().then(setPlayerStats).catch(console.error);
  }, []);

  // Elapsed timer — runs in background while analyzing
  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - analysisStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAnalyzing, analysisStartTime]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const docs = await getBrdDocuments();
      setDocuments(docs);
      return docs;
    } catch (err) {
      console.error('Failed to fetch BRD history:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Resume in-progress analysis on mount (e.g., after navigating away and back)
  useEffect(() => {
    const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes — only treat as stuck if very old
    const resumeIfAnalyzing = async () => {
      const docs = await getBrdDocuments();
      const inProgress = docs.find((d) => d.analysis_status === 'analyzing');
      if (inProgress) {
        const age = Date.now() - new Date(inProgress.created_at).getTime();
        if (age > STALE_THRESHOLD_MS) {
          // Stuck analysis — auto-mark as failed
          await cancelBrdAnalysis(inProgress.id).catch(console.error);
          await fetchHistory();
          return;
        }
        setCurrentDocId(inProgress.id);
        setCurrentDocTitle(inProgress.title);
        setIsAnalyzing(true);
        setAnalysisStartTime(new Date(inProgress.created_at).getTime());
        setViewState('analyzing');
      }
    };
    resumeIfAnalyzing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle scroll submission — streams analysis with live reasoning
  const handleSubmit = async (text: string, title: string, fileName: string | null, model?: string) => {
    setViewState('analyzing');
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setAnalysisStartTime(Date.now());
    setElapsed(0);
    setError(null);
    setStreamReasoning('');
    setStreamStatus('');
    setStreamPhase('');
    setCurrentDocTitle(title);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/brd/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, fileName, model: model || 'deepseek-v4-pro' }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(errBody.error || 'Analysis failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (!dataLine?.startsWith('data: ')) continue;
            const data = dataLine.slice(6);

            switch (event) {
              case 'doc_id':
                setCurrentDocId(data);
                break;
              case 'status':
                setStreamStatus(data);
                break;
              case 'phase':
                setStreamPhase(data);
                break;
              case 'reasoning':
                setStreamReasoning((prev) => prev + data);
                break;
              case 'error':
                setError(data);
                break;
              case 'complete': {
                const result = JSON.parse(data);
                setExtras({
                  flow_process: (result.flow_process || []) as FlowStep[],
                  improvements: (result.improvements || []) as ImprovementItem[],
                  questions: (result.questions || []) as QuestionItem[],
                  risk_analysis: (result.risk_analysis || []) as RiskItem[],
                  architecture_diagram: result.architecture_diagram || '',
                  impacted_systems: (result.impacted_systems || []) as ImpactedSystem[],
                  fsd_design: (result.fsd_design || []) as FsdDesignItem[],
                });
                const feats = await getBrdFeatures(result.documentId);
                setFeatures(feats);
                setIsAnalyzing(false);
                setAnalysisComplete(true);
                await fetchHistory();
                if (viewStateRef.current === 'analyzing') {
                  setViewState('results');
                  setAnalysisComplete(false);
                }
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      abortControllerRef.current = null;

      if (err instanceof Error && err.name === 'AbortError') {
        if (currentDocId) {
          await cancelBrdAnalysis(currentDocId).catch(console.error);
        }
        setIsAnalyzing(false);
        setError('Analysis stopped.');
        await fetchHistory();
        if (viewStateRef.current === 'analyzing') {
          setViewState('input');
        }
        return;
      }

      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsAnalyzing(false);
      if (viewStateRef.current === 'analyzing') {
        setViewState('input');
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Kill the current running analysis
  const handleKillAnalysis = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (currentDocId) {
      await cancelBrdAnalysis(currentDocId).catch(console.error);
    }
    setIsAnalyzing(false);
    setAnalysisComplete(false);
    setViewState('input');
    setError('Analysis stopped.');
    await fetchHistory();
  };

  // View a past analysis
  const handleViewDocument = async (docId: string) => {
    try {
      const feats = await getBrdFeatures(docId);
      const doc = documents.find((d) => d.id === docId);
      setFeatures(feats);
      setCurrentDocTitle(doc?.title || 'Unknown Scroll');
      setCurrentDocId(docId);
      // Load extras from the document record
      setExtras({
        flow_process: (doc?.flow_process || []) as FlowStep[],
        improvements: (doc?.improvements || []) as ImprovementItem[],
        questions: (doc?.questions || []) as QuestionItem[],
        risk_analysis: (doc?.risk_analysis || []) as RiskItem[],
        architecture_diagram: doc?.architecture_diagram || '',
        impacted_systems: (doc?.impacted_systems || []) as ImpactedSystem[],
        fsd_design: (doc?.fsd_design || []) as FsdDesignItem[],
      });
      setViewState('results');
    } catch (err) {
      console.error('Failed to load features:', err);
    }
  };

  // Re-analyze the current document
  const handleReanalyze = () => {
    const doc = documents.find((d) => d.id === currentDocId);
    if (doc) {
      handleSubmit(doc.source_text, doc.title, doc.file_name);
    }
  };

  // Delete a document
  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteBrdDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (viewState === 'results') {
        setViewState('input');
        setFeatures([]);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Navigate to the active analysis (in-progress or completed)
  const openActiveAnalysis = () => {
    if (analysisComplete) {
      setAnalysisComplete(false);
      setViewState('results');
    } else {
      setViewState('analyzing');
    }
  };

  // Memoized filter derivations — avoids recomputation on timer ticks and tab switches
  const isFunctional = (f: BrdFeature) => f.requirement_type !== 'non_functional';

  const functionalFeatures = useMemo(() => features.filter(isFunctional), [features]);
  const nonFunctionalFeatures = useMemo(() => features.filter((f) => !isFunctional(f)), [features]);

  // Single render function for ProphecyCard lists — prevents prop drift across call sites
  const renderFeatureCards = (list: BrdFeature[]) =>
    list.map((feature, index) => (
      <ProphecyCard
        key={feature.id}
        featureNumber={index + 1}
        name={feature.name}
        description={feature.description}
        businessFlow={feature.business_flow}
        asIs={feature.as_is}
        toBe={feature.to_be}
        risks={feature.risks}
        suggestedPriority={feature.suggested_priority}
        precondition={feature.precondition}
        postcondition={feature.postcondition}
        userRoles={feature.user_roles}
        impactedProcess={feature.impacted_process}
        scope={feature.scope}
        accountingImpact={feature.accounting_impact}
      />
    ));

  return (
    <div className="flex min-h-screen">
      <Sidebar playerStats={playerStats} activeRoute="/oracle" />

      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="font-pixel text-lg text-rpg-legendary"
            style={{ textShadow: '2px 2px 0px #000' }}
          >
            🔮 The Oracle
          </h1>
          <div className="flex gap-2">
            {viewState !== 'input' && !isAnalyzing && (
              <button
                onClick={() => { setViewState('input'); setError(null); }}
                className="px-3 py-2 font-retro text-sm text-gray-300 pixel-border hover:border-rpg-rare hover:text-white transition-colors cursor-pointer"
              >
                + New Scroll
              </button>
            )}
            <button
              onClick={() => {
                if (viewState === 'history') {
                  setViewState(isAnalyzing ? 'analyzing' : previousView);
                } else {
                  setPreviousView(viewState);
                  setViewState('history');
                }
              }}
              className="px-3 py-2 font-retro text-sm text-gray-300 pixel-border hover:border-rpg-rare hover:text-white transition-colors cursor-pointer"
            >
              {viewState === 'history' ? '← Back' : '📚 History'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rpg-card border-red-500 p-4 mb-6">
            <p className="font-retro text-sm text-red-400">⚠ {error}</p>
          </div>
        )}

        {/* Input View */}
        {viewState === 'input' && (
          <div className="max-w-2xl mx-auto">
            <div className="rpg-card p-6 mb-6">
              <p className="font-retro text-sm text-gray-300 mb-4">
                Present your Business Requirement Document to The Oracle.
                Upload a PDF or paste the text directly — The Oracle shall decipher
                its prophecies and reveal the features hidden within.
              </p>
              <ScrollInput onSubmit={handleSubmit} isLoading={false} />
            </div>
          </div>
        )}

        {/* Analyzing View */}
        {viewState === 'analyzing' && (
          <OracleLoading
            title={currentDocTitle}
            elapsed={elapsed}
            onKill={handleKillAnalysis}
            reasoning={streamReasoning}
            status={streamStatus}
            phase={streamPhase}
          />
        )}

        {/* Results View — Bento Grid Layout */}
        {viewState === 'results' && (
          <div>
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-pixel text-xs text-rpg-rare mb-1">Prophecies Revealed</h2>
                <p className="font-retro text-sm text-gray-400">
                  📜 {currentDocTitle} — {features.length} feature{features.length !== 1 ? 's' : ''} deciphered
                </p>
              </div>
              {currentDocId && !isAnalyzing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRawModal(true)}
                    className="px-3 py-2 font-retro text-xs text-gray-400 pixel-border border-rpg-border hover:border-rpg-rare hover:text-white transition-all cursor-pointer"
                  >
                    📄 Raw JSON
                  </button>
                  <button
                    onClick={handleReanalyze}
                    className="px-3 py-2 font-retro text-xs text-rpg-epic pixel-border border-rpg-epic hover:shadow-epic hover:text-white transition-all cursor-pointer"
                  >
                    🔄 Re-analyze
                  </button>
                </div>
              )}
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-4">

              {/* LEFT COLUMN — Flow Process (full height) */}
              <div className="rpg-card p-4 lg:row-span-2 overflow-y-auto max-h-[80vh]">
                <h3 className="font-pixel text-[9px] text-cyan-400 mb-3 sticky top-0 bg-rpg-card pb-2">
                  🗺️ Flow Process
                </h3>
                {extras.flow_process.length > 0 ? (
                  <div className="space-y-0">
                    {extras.flow_process.map((step, i) => {
                      const isLast = i === extras.flow_process.length - 1;
                      const borderColor = step.type === 'start' ? 'border-green-500'
                        : step.type === 'end' ? 'border-red-500'
                        : step.type === 'decision' ? 'border-yellow-500'
                        : 'border-rpg-border';
                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`w-full px-2 py-2 border rounded ${borderColor} bg-rpg-dark/50`}>
                            <div className="flex items-center gap-2">
                              <span className="font-pixel text-[7px] text-gray-500 w-4">{step.id}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-pixel text-[7px] text-rpg-rare">{step.actor}</p>
                                <p className="font-retro text-xs text-gray-200 truncate">{step.action}</p>
                              </div>
                            </div>
                          </div>
                          {!isLast && (
                            <div className="w-0.5 h-2 bg-rpg-border" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-retro text-xs text-gray-500 italic">Re-analyze to generate flow.</p>
                )}
              </div>

              {/* CENTER COLUMN — Functional Requirements */}
              <div className="rpg-card p-4 overflow-y-auto max-h-[40vh] lg:max-h-[39vh]">
                <h3 className="font-pixel text-[9px] text-pink-400 mb-3 sticky top-0 bg-rpg-card pb-2">
                  ⚔️ Functional Requirements ({functionalFeatures.length})
                </h3>
                {functionalFeatures.length > 0 ? (
                  <div className="space-y-3">
                    {renderFeatureCards(functionalFeatures)}
                  </div>
                ) : (
                  <p className="font-retro text-xs text-gray-500 italic">No functional requirements found.</p>
                )}
              </div>

              {/* RIGHT COLUMN — Improvements (top) */}
              <div className="rpg-card p-4 overflow-y-auto max-h-[40vh] lg:max-h-[39vh]">
                <h3 className="font-pixel text-[9px] text-green-400 mb-3 sticky top-0 bg-rpg-card pb-2">
                  💡 Improvements ({extras.improvements.length})
                </h3>
                {extras.improvements.length > 0 ? (
                  <div className="space-y-2">
                    {extras.improvements.map((item, i) => (
                      <div key={i} className="p-2 bg-rpg-dark/50 border border-rpg-border rounded">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="font-retro text-xs text-gray-200 flex-1">
                            <span className="text-green-400 font-pixel text-[7px] mr-1">#{i + 1}</span>
                            {typeof item === 'string' ? item : item.title}
                          </p>
                          {typeof item !== 'string' && item.priority && (
                            <span className={`font-pixel text-[7px] px-1 rounded ${
                              item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>{item.priority}</span>
                          )}
                        </div>
                        {typeof item !== 'string' && item.description && (
                          <p className="font-retro text-[11px] text-gray-400 mt-1">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-retro text-xs text-gray-500 italic">Re-analyze to generate.</p>
                )}
              </div>

              {/* CENTER COLUMN — Non-Functional Requirements */}
              <div className="rpg-card p-4 overflow-y-auto max-h-[40vh] lg:max-h-[39vh]">
                <h3 className="font-pixel text-[9px] text-orange-400 mb-3 sticky top-0 bg-rpg-card pb-2">
                  🛡️ Non-Functional Requirements ({nonFunctionalFeatures.length})
                </h3>
                {nonFunctionalFeatures.length > 0 ? (
                  <div className="space-y-3">
                    {renderFeatureCards(nonFunctionalFeatures)}
                  </div>
                ) : (
                  <p className="font-retro text-xs text-gray-500 italic">No non-functional requirements found.</p>
                )}
              </div>

              {/* RIGHT COLUMN — Questions (bottom) */}
              <div className="rpg-card p-4 overflow-y-auto max-h-[40vh] lg:max-h-[39vh]">
                <h3 className="font-pixel text-[9px] text-yellow-400 mb-3 sticky top-0 bg-rpg-card pb-2">
                  ❓ Questions ({extras.questions.length})
                </h3>
                {extras.questions.length > 0 ? (
                  <div className="space-y-2">
                    {extras.questions.map((item, i) => (
                      <div key={i} className="p-2 bg-rpg-dark/50 border border-rpg-border rounded">
                        <p className="font-retro text-xs text-gray-200">
                          <span className="text-yellow-400 font-pixel text-[7px] mr-1">Q{i + 1}</span>
                          {typeof item === 'string' ? item : item.question}
                        </p>
                        {typeof item !== 'string' && item.target_role && (
                          <span className="font-retro text-[10px] text-blue-400 mt-1 inline-block">
                            → {item.target_role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-retro text-xs text-gray-500 italic">Re-analyze to generate.</p>
                )}
              </div>

            </div>

            {/* Risk Analysis — Full width below the grid */}
            {extras.risk_analysis.length > 0 && (
              <div className="mt-4 rpg-card p-4">
                <h3 className="font-pixel text-[9px] text-red-400 mb-3">
                  ⚠️ Analisis Risiko ({extras.risk_analysis.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {extras.risk_analysis.map((item, i) => {
                    const { borderColor, badgeClass } = getImpactStyles(item.impact);
                    return (
                      <div key={i} className="p-3 bg-rpg-dark/50 border-l-3 rounded" style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}>
                        <span className={`font-pixel text-[7px] px-1.5 py-0.5 rounded ${badgeClass}`}>
                          {item.impact.toUpperCase()}
                        </span>
                        <p className="font-retro text-xs text-gray-200 mt-1.5">{item.risk}</p>
                        {item.mitigation && (
                          <p className="font-retro text-[11px] text-gray-400 mt-1">
                            <span className="text-rpg-rare">Mitigasi:</span> {item.mitigation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Architecture Diagram — Mermaid rendered */}
            {extras.architecture_diagram && (
              <div className="mt-4 rpg-card p-4">
                <h3 className="font-pixel text-[9px] text-purple-400 mb-3">
                  🏗️ Diagram Arsitektur Sistem
                </h3>
                <MermaidDiagram code={extras.architecture_diagram} />
              </div>
            )}

            {/* Impacted Systems — Table */}
            {extras.impacted_systems.length > 0 && (
              <div className="mt-4 rpg-card p-4">
                <h3 className="font-pixel text-[9px] text-blue-400 mb-3">
                  🖥️ Sistem yang Terdampak ({extras.impacted_systems.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full font-retro text-xs">
                    <thead>
                      <tr className="border-b border-rpg-border">
                        <th className="text-left py-2 px-3 text-rpg-rare">Sistem</th>
                        <th className="text-left py-2 px-3 text-rpg-rare">Deskripsi Dampak</th>
                        <th className="text-left py-2 px-3 text-rpg-rare">Tipe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extras.impacted_systems.map((sys, i) => (
                        <tr key={i} className="border-b border-rpg-border/30">
                          <td className="py-2 px-3 text-white font-pixel text-[8px]">{sys.system_name}</td>
                          <td className="py-2 px-3 text-gray-300">{sys.description}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 text-[10px]">
                              {sys.impact_type?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* FSD Design Recommendations */}
            {extras.fsd_design.length > 0 && (
              <div className="mt-4 rpg-card p-4">
                <h3 className="font-pixel text-[9px] text-emerald-400 mb-3">
                  📋 Rekomendasi Desain Fitur (FSD) ({extras.fsd_design.length})
                </h3>
                <div className="space-y-3">
                  {extras.fsd_design.map((item, i) => (
                    <div key={i} className="p-3 bg-rpg-dark/50 border border-rpg-border rounded">
                      <h4 className="font-pixel text-[8px] text-white mb-2">
                        <span className="text-emerald-400 mr-1">#{i + 1}</span>
                        {item.feature_name}
                      </h4>
                      <p className="font-retro text-xs text-gray-300 mb-2">{item.explanation}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <div className="bg-rpg-dark/50 border-l-2 border-cyan-500 pl-2 py-1">
                          <p className="font-retro text-[10px] text-cyan-400 uppercase mb-0.5">Aksi User</p>
                          <p className="font-retro text-xs text-gray-300">{item.user_action}</p>
                        </div>
                        <div className="bg-rpg-dark/50 border-l-2 border-purple-500 pl-2 py-1">
                          <p className="font-retro text-[10px] text-purple-400 uppercase mb-0.5">Reaksi Sistem</p>
                          <p className="font-retro text-xs text-gray-300">{item.system_reaction}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {viewState === 'history' && (
          <div>
            <h2 className="font-pixel text-xs text-rpg-rare mb-4">
              📚 Past Scrolls
            </h2>

            {/* In-progress or completed analysis */}
            {(isAnalyzing || analysisComplete) && (
              <div
                onClick={openActiveAnalysis}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') openActiveAnalysis(); }}
                className={`rpg-card p-4 flex items-center justify-between mb-3 cursor-pointer hover:translate-y-[-1px] transition-all ${
                  analysisComplete
                    ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                    : 'border-rpg-legendary shadow-legendary'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`text-xl ${analysisComplete ? '' : 'animate-bounce'}`} style={analysisComplete ? {} : { animationDuration: '2s' }}>
                    {analysisComplete ? '✅' : '🔮'}
                  </span>
                  <div>
                    <h3 className={`font-pixel text-[10px] mb-1 ${analysisComplete ? 'text-green-400' : 'text-rpg-legendary'}`}>
                      {currentDocTitle}
                    </h3>
                    <p className={`font-retro text-xs ${analysisComplete ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`}>
                      {analysisComplete ? '✓ Analysis complete! Click to view results' : `⏳ Analysis in progress... (${elapsed}s)`}
                    </p>
                  </div>
                </div>
                <span className={`font-retro text-xs ${analysisComplete ? 'text-green-400' : 'text-rpg-legendary'}`}>
                  View →
                </span>
              </div>
            )}

            {documents.length === 0 && !isAnalyzing ? (
              <div className="text-center py-12">
                <p className="font-retro text-sm text-gray-500">
                  No scrolls have been consulted yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rpg-card p-4 flex items-center justify-between"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleViewDocument(doc.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleViewDocument(doc.id);
                      }}
                    >
                      <h3 className="font-pixel text-[10px] text-white mb-1">
                        {doc.title}
                      </h3>
                      <p className="font-retro text-xs text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString()} •{' '}
                        {doc.file_name || 'Pasted text'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="ml-4 px-2 py-1 font-retro text-xs text-red-400 hover:text-red-300 pixel-border border-red-500/30 hover:border-red-500 transition-colors cursor-pointer"
                      aria-label={`Delete ${doc.title}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Raw JSON Modal */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowRawModal(false)}>
          <div
            className="rpg-card p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-pixel text-[10px] text-rpg-legendary">📄 Raw Analysis JSON</h3>
              <button
                onClick={() => setShowRawModal(false)}
                className="font-retro text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <pre className="font-retro text-[11px] text-gray-300 bg-rpg-dark p-4 rounded overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify({ features, extras }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

