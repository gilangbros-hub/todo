'use client';

import { ImpactedSystem } from '@/lib/oracle/types';
import { OracleIcon } from './OracleIcon';

interface IntegrationCardProps {
  system: ImpactedSystem;
  index: number;
}

const IMPACT_TYPE_COLORS: Record<string, string> = {
  integration: 'bg-oracle-sapphire/20 text-oracle-sapphire border-oracle-sapphire/30',
  dependency: 'bg-oracle-gold/20 text-oracle-gold border-oracle-gold/30',
  data: 'bg-oracle-medium/20 text-oracle-medium border-oracle-medium/30',
  api: 'bg-oracle-low/20 text-oracle-low border-oracle-low/30',
};

const SYSTEM_ICONS: Record<string, string> = {
  integration: 'sync_alt',
  dependency: 'account_tree',
  data: 'database',
  api: 'api',
};

export function IntegrationCard({ system, index }: IntegrationCardProps) {
  const impactColor = IMPACT_TYPE_COLORS[system.impact_type] || IMPACT_TYPE_COLORS.integration;
  const iconName = SYSTEM_ICONS[system.impact_type] || 'hub';

  return (
    <div
      className="group relative bg-oracle-stone border border-oracle-border rounded-lg p-6 hover:shadow-oracle-glow transition-shadow cursor-pointer overflow-hidden"
      style={{
        animation: `flip-in 0.4s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Large background icon */}
      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <OracleIcon name={iconName} size={80} className="text-oracle-gold" />
      </div>

      {/* Impact type badge */}
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-oracle-mono border mb-4 ${impactColor}`}>
        {system.impact_type}
      </span>

      {/* System name */}
      <h3 className="font-oracle-display text-oracle-text text-lg mb-2 relative z-10">
        {system.system_name}
      </h3>

      {/* Description */}
      <p className="text-oracle-muted text-sm font-oracle-body leading-relaxed mb-4 relative z-10">
        {system.description}
      </p>

      {/* Inspect link */}
      <div className="flex items-center gap-1.5 text-oracle-gold/70 group-hover:text-oracle-gold text-xs font-oracle-mono transition-colors relative z-10">
        <OracleIcon name="search" size={14} />
        Inspect Node
      </div>
    </div>
  );
}
