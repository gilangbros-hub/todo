'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOracle } from '@/lib/oracle/context';
import { ScoreOrb } from '@/components/oracle/ScoreOrb';
import { OracleIcon } from '@/components/oracle/OracleIcon';
import { CHAPTERS } from '@/lib/oracle/types';

interface ChapterCardData {
  slug: string;
  label: string;
  icon: string;
  number: number;
  count: number;
}

export default function CodexPage() {
  const { features, extras, activeDocument } = useOracle();
  const router = useRouter();

  const functionalCount = useMemo(
    () => features.filter((f) => f.requirement_type === 'functional').length,
    [features]
  );
  const nonFunctionalCount = useMemo(
    () => features.filter((f) => f.requirement_type === 'non_functional').length,
    [features]
  );

  // Build chapter overview data with item counts
  const chapterCards: ChapterCardData[] = useMemo(() => {
    // Skip gatehouse (0) and reveal (1) — they don't have countable items
    const chapters = CHAPTERS.filter((c) => c.number >= 2);

    return chapters.map((ch) => {
      let count = 0;
      switch (ch.slug) {
        case 'scroll':
          count = functionalCount;
          break;
        case 'silent-laws':
          count = nonFunctionalCount;
          break;
        case 'flow':
          count = extras.flow_process.length;
          break;
        case 'tome':
          count = features.length;
          break;
        case 'realms':
          count = extras.impacted_systems.length;
          break;
        case 'trials':
          count = extras.risk_analysis.length;
          break;
        case 'grand-map':
          count = extras.architecture_diagram ? 1 : 0;
          break;
        case 'counsel':
          count = extras.improvements.length + extras.questions.length;
          break;
        case 'codex':
          count = 0; // Self-reference
          break;
        default:
          count = 0;
      }
      return {
        slug: ch.slug,
        label: ch.label,
        icon: ch.icon,
        number: ch.number,
        count,
      };
    });
  }, [features, extras, functionalCount, nonFunctionalCount]);

  // Calculate completeness score based on populated sections
  const completenessScore = useMemo(() => {
    const sections = [
      functionalCount > 0,
      nonFunctionalCount > 0,
      extras.flow_process.length > 0,
      features.length > 0,
      extras.impacted_systems.length > 0,
      extras.risk_analysis.length > 0,
      !!extras.architecture_diagram,
      extras.improvements.length > 0,
      extras.questions.length > 0,
    ];
    const filled = sections.filter(Boolean).length;
    return Math.round((filled / sections.length) * 100);
  }, [features, extras, functionalCount, nonFunctionalCount]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          THE CODEX
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          {activeDocument?.title
            ? `Synthesis of "${activeDocument.title}"`
            : 'Complete Analysis Summary'}
        </p>
      </div>

      {/* Score Orb */}
      <div className="flex justify-center mb-12">
        <ScoreOrb score={completenessScore} label="Completeness" />
      </div>

      {/* Chapter Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {chapterCards.map((card, index) => (
          <button
            key={card.slug}
            onClick={() => router.push(`/oracle/${card.slug}`)}
            className="group relative bg-oracle-card border border-oracle-border rounded-lg p-5 text-left hover:border-oracle-gold/40 hover:shadow-oracle-glow-sm transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ animation: `flip-in 0.4s ease-out ${index * 0.07}s both` }}
          >
            {/* Background icon */}
            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <OracleIcon name={card.icon} size={56} className="text-oracle-gold" />
            </div>

            {/* Chapter number */}
            <span className="inline-block w-6 h-6 rounded-full bg-oracle-gold/10 border border-oracle-gold/30 text-oracle-gold text-xs font-oracle-mono flex items-center justify-center mb-3">
              {card.number}
            </span>

            {/* Chapter name */}
            <h3 className="font-oracle-display text-oracle-text text-sm mb-1 relative z-10">
              {card.label}
            </h3>

            {/* Item count */}
            <p className="text-oracle-muted text-xs font-oracle-mono relative z-10">
              {card.count} {card.count === 1 ? 'item' : 'items'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
