'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOracle } from '@/lib/oracle/context';
import { RequirementCard } from '@/components/oracle/RequirementCard';
import { OracleIcon } from '@/components/oracle/OracleIcon';

export default function SilentLawsPage() {
  const { features } = useOracle();
  const router = useRouter();

  const nonFunctionalFeatures = useMemo(
    () => features.filter((f) => f.requirement_type === 'non_functional'),
    [features]
  );

  function handleCardClick(featureId: string) {
    router.push(`/oracle/reveal/${featureId}`);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="space-y-2">
        <h1 className="font-oracle-display text-oracle-gold text-oracle-headline-lg">
          The Silent Laws
        </h1>
        <p className="text-oracle-muted font-oracle-body text-oracle-body-md">
          Operational Constraints &amp; Quality Attributes
        </p>
      </header>

      {/* Content */}
      {nonFunctionalFeatures.length > 0 ? (
        <div className="space-y-4">
          {nonFunctionalFeatures.map((feature, index) => (
            <RequirementCard
              key={feature.id}
              feature={feature}
              index={index}
              variant="expanded"
              onSelect={handleCardClick}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="relative border border-oracle-border border-dashed bg-oracle-card rounded-lg p-12">
          {/* Corner accent decorations */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-oracle-gold/40 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-oracle-gold/40 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-oracle-gold/40 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-oracle-gold/40 rounded-br-lg" />

          <div className="flex flex-col items-center justify-center text-center space-y-5">
            {/* Animated hourglass icon */}
            <span
              className="material-symbols-outlined text-[80px] text-oracle-gold/60"
              style={{
                animation: 'slow-spin 3s ease-in-out infinite',
              }}
            >
              hourglass_empty
            </span>

            {/* Title */}
            <h2 className="font-oracle-display text-oracle-gold text-oracle-headline-md">
              The Tome is Silent
            </h2>

            {/* Description */}
            <p className="text-oracle-muted font-oracle-body text-oracle-body-md max-w-md">
              No Silent Laws (Non-Functional Requirements) inscribed yet.
            </p>

            {/* CTA Button */}
            <button
              onClick={() => router.push('/oracle/gatehouse')}
              className="mt-2 px-6 py-2.5 bg-oracle-gold text-oracle-deepest font-oracle-body font-semibold rounded-lg hover:bg-oracle-gold-fixed transition-colors duration-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <OracleIcon name="edit_note" size={18} />
                Inscribe Manual Laws
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
