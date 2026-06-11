'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOracle } from '@/lib/oracle/context';
import { OracleIcon } from '@/components/oracle/OracleIcon';
import { ImprovementItem, QuestionItem } from '@/lib/oracle/types';

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-oracle-critical/20 text-oracle-critical border-oracle-critical/30',
  medium: 'bg-oracle-medium/20 text-oracle-medium border-oracle-medium/30',
  low: 'bg-oracle-low/20 text-oracle-low border-oracle-low/30',
};

function ImprovementCard({ item, index }: { item: ImprovementItem; index: number }) {
  const priorityClass = PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.medium;

  return (
    <div
      className="bg-oracle-card border border-oracle-border rounded-lg p-5 hover:border-oracle-gold/40 hover:shadow-oracle-glow-sm transition-all duration-300"
      style={{ animation: `flip-in 0.4s ease-out ${index * 0.08}s both` }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-oracle-display text-oracle-text text-sm leading-tight">
          {item.title}
        </h4>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-oracle-mono border ${priorityClass}`}>
          {item.priority}
        </span>
      </div>
      <p className="text-oracle-muted text-sm font-oracle-body leading-relaxed mb-3">
        {item.description}
      </p>
      <span className="inline-block px-2 py-0.5 rounded text-xs font-oracle-mono bg-oracle-panel text-oracle-faint border border-oracle-border">
        {item.category}
      </span>
    </div>
  );
}

function QuestionCard({
  item,
  index,
  resolution,
  onResolutionChange,
}: {
  item: QuestionItem;
  index: number;
  resolution: string;
  onResolutionChange: (value: string) => void;
}) {
  return (
    <div
      className="bg-oracle-card border border-oracle-border rounded-lg p-5 hover:border-oracle-sapphire/40 transition-all duration-300"
      style={{ animation: `flip-in 0.4s ease-out ${index * 0.08}s both` }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-oracle-body text-oracle-text text-sm leading-relaxed">
          {item.question}
        </p>
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-oracle-mono bg-oracle-sapphire/20 text-oracle-sapphire border border-oracle-sapphire/30">
          {item.target_role}
        </span>
      </div>
      {item.context && (
        <p className="text-oracle-faint text-xs font-oracle-body mb-3">
          Context: {item.context}
        </p>
      )}
      <textarea
        value={resolution}
        onChange={(e) => onResolutionChange(e.target.value)}
        placeholder="Write your resolution here..."
        className="w-full mt-2 p-3 bg-oracle-deepest border border-oracle-border rounded text-oracle-text text-sm font-oracle-body placeholder:text-oracle-faint resize-y min-h-[60px] focus:outline-none focus:border-oracle-sapphire/50 transition-colors"
        rows={2}
      />
    </div>
  );
}

export default function CounselPage() {
  const { extras, activeDocument } = useOracle();
  const improvements = extras.improvements;
  const questions = extras.questions;

  // Resolution persistence via localStorage
  const storageKey = activeDocument ? `oracle-counsel-${activeDocument.id}` : null;

  const [resolutions, setResolutions] = useState<Record<number, string>>({});

  // Load from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setResolutions(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey]);

  // Save to localStorage on change
  const updateResolution = useCallback(
    (index: number, value: string) => {
      setResolutions((prev) => {
        const next = { ...prev, [index]: value };
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // Ignore storage errors
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          The Oracle&apos;s Counsel
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          Wisdom Scrolls &amp; Unanswered Runes
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Improvement Scrolls */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <OracleIcon name="lightbulb" className="text-oracle-gold" size={20} />
            <h2 className="font-oracle-display text-oracle-text text-lg">
              Improvement Scrolls
            </h2>
          </div>

          {improvements.length > 0 ? (
            <div className="flex flex-col gap-4">
              {improvements.map((item, index) => (
                <ImprovementCard key={`imp-${index}`} item={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-oracle-card border border-oracle-border rounded-lg">
              <OracleIcon name="lightbulb" size={40} className="text-oracle-faint mb-3" />
              <p className="font-oracle-body text-sm text-oracle-muted">
                No improvement suggestions available
              </p>
            </div>
          )}
        </div>

        {/* Right: Unanswered Runes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <OracleIcon name="help" className="text-oracle-sapphire" size={20} />
            <h2 className="font-oracle-display text-oracle-text text-lg">
              Unanswered Runes
            </h2>
          </div>

          {questions.length > 0 ? (
            <div className="flex flex-col gap-4">
              {questions.map((item, index) => (
                <QuestionCard
                  key={`q-${index}`}
                  item={item}
                  index={index}
                  resolution={resolutions[index] || ''}
                  onResolutionChange={(value) => updateResolution(index, value)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-oracle-card border border-oracle-border rounded-lg">
              <OracleIcon name="help" size={40} className="text-oracle-faint mb-3" />
              <p className="font-oracle-body text-sm text-oracle-muted">
                No unanswered questions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
