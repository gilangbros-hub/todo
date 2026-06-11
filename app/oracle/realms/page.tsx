'use client';

import { useOracle } from '@/lib/oracle/context';
import { IntegrationCard } from '@/components/oracle/IntegrationCard';
import { OracleIcon } from '@/components/oracle/OracleIcon';

export default function RealmsPage() {
  const { extras } = useOracle();
  const systems = extras.impacted_systems;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          The Affected Realms
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          System Dependencies &amp; Integration Points
        </p>
      </div>

      {/* Integration Cards Grid or Empty State */}
      {systems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {systems.map((system, index) => (
            <IntegrationCard key={`${system.system_name}-${index}`} system={system} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <OracleIcon name="lan" size={64} className="text-oracle-faint mb-4" />
          <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
            No impacted systems identified
          </p>
          <p className="font-oracle-body text-oracle-body-md text-oracle-faint mt-2">
            The Oracle has not detected external system dependencies for this document.
          </p>
        </div>
      )}
    </div>
  );
}
