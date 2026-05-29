'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlayerStats, BrdDocument, BrdFeature } from '@/lib/types';
import { getPlayerStats } from '@/lib/services/player-stats';
import { getBrdDocuments, getBrdFeatures, saveBrdAnalysis, deleteBrdDocument } from '@/lib/services/brd';
import { ValidatedFeature } from '@/lib/brd/prompt';
import Sidebar from '@/components/Sidebar';
import ScrollInput from '@/components/ScrollInput';
import ProphecyCard from '@/components/ProphecyCard';

type ViewState = 'input' | 'analyzing' | 'results' | 'history';

export default function OraclePage() {
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: '', user_id: '', xp: 0, level: 1, streak: 0, last_completed_date: null,
  });
  const [viewState, setViewState] = useState<ViewState>('input');
  const [features, setFeatures] = useState<BrdFeature[]>([]);
  const [documents, setDocuments] = useState<BrdDocument[]>([]);
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch player stats
  useEffect(() => {
    getPlayerStats().then(setPlayerStats).catch(console.error);
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const docs = await getBrdDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch BRD history:', err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle scroll submission
  const handleSubmit = async (text: string, title: string, fileName: string | null) => {
    setViewState('analyzing');
    setError(null);
    setCurrentDocTitle(title);

    try {
      // 1. Call the analysis API
      const res = await fetch('/api/brd/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, fileName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const data = await res.json();
      const validatedFeatures: ValidatedFeature[] = data.features;

      // 2. Save to database
      const saved = await saveBrdAnalysis(title, data.sourceText, fileName, validatedFeatures);
      setFeatures(saved.features);
      setViewState('results');
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setViewState('input');
    }
  };

  // View a past analysis
  const handleViewDocument = async (docId: string) => {
    try {
      const feats = await getBrdFeatures(docId);
      const doc = documents.find((d) => d.id === docId);
      setFeatures(feats);
      setCurrentDocTitle(doc?.title || 'Unknown Scroll');
      setViewState('results');
    } catch (err) {
      console.error('Failed to load features:', err);
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
            {viewState !== 'input' && (
              <button
                onClick={() => { setViewState('input'); setError(null); }}
                className="px-3 py-2 font-retro text-sm text-gray-300 pixel-border hover:border-rpg-rare hover:text-white transition-colors"
              >
                + New Scroll
              </button>
            )}
            <button
              onClick={() => setViewState(viewState === 'history' ? 'input' : 'history')}
              className="px-3 py-2 font-retro text-sm text-gray-300 pixel-border hover:border-rpg-rare hover:text-white transition-colors"
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
          <div className="max-w-md mx-auto text-center py-16">
            <div className="animate-pulse mb-6">
              <span className="text-5xl">🔮</span>
            </div>
            <p className="font-pixel text-xs text-rpg-legendary mb-4">
              The Oracle is reading your scroll...
            </p>
            <p className="font-retro text-sm text-gray-400">
              Deciphering prophecies from &ldquo;{currentDocTitle}&rdquo;
            </p>
            <div className="mt-6 w-48 h-2 bg-rpg-card border border-rpg-border rounded-pixel mx-auto overflow-hidden">
              <div className="h-full bg-rpg-epic animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Results View */}
        {viewState === 'results' && (
          <div>
            <div className="mb-6">
              <h2 className="font-pixel text-xs text-rpg-rare mb-1">
                Prophecies Revealed
              </h2>
              <p className="font-retro text-sm text-gray-400">
                📜 {currentDocTitle} — {features.length} feature{features.length !== 1 ? 's' : ''} deciphered
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatBox label="Total" value={features.length.toString()} color="text-white" />
              <StatBox
                label="Legendary"
                value={features.filter((f) => f.suggested_priority === 'legendary').length.toString()}
                color="text-rpg-legendary"
              />
              <StatBox
                label="Epic"
                value={features.filter((f) => f.suggested_priority === 'epic').length.toString()}
                color="text-rpg-epic"
              />
              <StatBox
                label="Pilot"
                value={features.filter((f) => f.pilot_status === 'pilot').length.toString()}
                color="text-rpg-rare"
              />
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <ProphecyCard
                  key={feature.id}
                  name={feature.name}
                  description={feature.description}
                  pilotStatus={feature.pilot_status}
                  retention={feature.retention}
                  businessFlow={feature.business_flow}
                  asIs={feature.as_is}
                  toBe={feature.to_be}
                  risks={feature.risks}
                  suggestedPriority={feature.suggested_priority}
                />
              ))}
            </div>
          </div>
        )}

        {/* History View */}
        {viewState === 'history' && (
          <div>
            <h2 className="font-pixel text-xs text-rpg-rare mb-4">
              📚 Past Scrolls
            </h2>
            {documents.length === 0 ? (
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
                      className="ml-4 px-2 py-1 font-retro text-xs text-red-400 hover:text-red-300 pixel-border border-red-500/30 hover:border-red-500 transition-colors"
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
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rpg-card p-3 text-center">
      <p className={`font-pixel text-lg ${color}`}>{value}</p>
      <p className="font-retro text-xs text-gray-400">{label}</p>
    </div>
  );
}
