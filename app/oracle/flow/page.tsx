'use client';

import { useOracle } from '@/lib/oracle/context';
import { FlowStepper } from '@/components/oracle/FlowStepper';
import { OracleIcon } from '@/components/oracle/OracleIcon';

export default function FlowPage() {
  const { extras } = useOracle();
  const steps = extras.flow_process;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          FLOW OF FATE
        </h1>
        <p className="font-oracle-mono text-oracle-label-mono text-oracle-muted tracking-wider uppercase">
          Chapter IV: Sequence of Tactical Operations
        </p>
      </div>

      {/* Flow Stepper or Empty State */}
      {steps.length > 0 ? (
        <FlowStepper steps={steps} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <OracleIcon name="account_tree" size={64} className="text-oracle-faint mb-4" />
          <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
            No flow process identified
          </p>
          <p className="font-oracle-body text-oracle-body-md text-oracle-faint mt-2">
            Upload a BRD document in The Gatehouse to generate the user journey flow.
          </p>
        </div>
      )}
    </div>
  );
}
