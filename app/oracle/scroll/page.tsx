'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOracle } from '@/lib/oracle/context';
import { RequirementCard } from '@/components/oracle/RequirementCard';
import { OracleIcon } from '@/components/oracle/OracleIcon';

export default function ScrollPage() {
  const { features } = useOracle();
  const router = useRouter();

  const functionalFeatures = useMemo(
    () => features.filter((f) => f.requirement_type === 'functional'),
    [features]
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          The Scroll
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          Dictates of Functionality &amp; User Empowerment
        </p>
      </div>

      {/* Requirement Cards */}
      {functionalFeatures.length > 0 ? (
        <div className="flex flex-col gap-6">
          {functionalFeatures.map((feature, index) => (
            <RequirementCard
              key={feature.id}
              feature={feature}
              index={index}
              onSelect={(featureId) => router.push(`/oracle/reveal/${featureId}`)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <OracleIcon name="history_edu" size={64} className="text-oracle-faint mb-4" />
          <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
            No functional requirements identified
          </p>
          <p className="font-oracle-body text-oracle-body-md text-oracle-faint mt-2">
            Upload a BRD document in The Gatehouse to begin analysis.
          </p>
        </div>
      )}

      {/* Proceed Button */}
      {functionalFeatures.length > 0 && (
        <div className="mt-10 flex justify-end">
          <button
            onClick={() => router.push('/oracle/silent-laws')}
            className="flex items-center gap-2 px-6 py-3 bg-oracle-gold text-oracle-deepest font-oracle-body font-semibold rounded hover:bg-oracle-gold-container transition-colors cursor-pointer"
          >
            Proceed to The Silent Laws
            <OracleIcon name="arrow_forward" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
