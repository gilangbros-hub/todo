'use client';

import { useOracle } from '@/lib/oracle/context';
import { ArchitectureCanvas } from '@/components/oracle/ArchitectureCanvas';
import { OracleIcon } from '@/components/oracle/OracleIcon';

export default function GrandMapPage() {
  const { extras } = useOracle();
  const diagramCode = extras.architecture_diagram;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          THE GRAND MAP
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          Architecture &amp; System Topology
        </p>
      </div>

      {/* Architecture Canvas or Empty State */}
      {diagramCode ? (
        <ArchitectureCanvas diagramCode={diagramCode} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <OracleIcon name="map" size={64} className="text-oracle-faint mb-4" />
          <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
            No architecture diagram available
          </p>
          <p className="font-oracle-body text-oracle-body-md text-oracle-faint mt-2">
            The Oracle has not yet charted the system topology for this document.
          </p>
        </div>
      )}
    </div>
  );
}
