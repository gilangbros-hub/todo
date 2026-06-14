'use client';

import { ImpactedComponent } from '@/lib/renata/types';
import { Layers, Search } from 'lucide-react';

interface IntegrationCardProps {
  system: ImpactedComponent;
  index: number;
}

const IMPACT_TYPE_COLORS: Record<string, string> = {
  integration: 'bg-sys-secondary/20 text-sys-secondary border-sys-secondary/30',
  dependency: 'bg-sys-primary/20 text-sys-primary border-sys-primary/30',
  data: 'bg-sys-warning/20 text-sys-warning border-sys-warning/30',
  api: 'bg-sys-success/20 text-sys-success border-sys-success/30',
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
      className="group relative bg-sys-surface border border-sys-border rounded-lg p-6 hover:shadow-neo-glow transition-shadow cursor-pointer overflow-hidden"
      style={{
        animation: `flip-in 0.4s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Large background icon */}
      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Layers size={80} className="text-sys-primary opacity-10" />
      </div>

      {/* Impact type badge */}
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono border mb-4 ${impactColor}`}>
        {system.impact_type}
      </span>

      {/* System name */}
      <h3 className="font-sans font-semibold text-sys-text text-lg mb-2 relative z-10">
        {system.component_name}
      </h3>

      {/* Description */}
      <p className="text-sys-muted text-sm font-sans leading-relaxed mb-4 relative z-10">
        {system.description}
      </p>

      {/* Inspect link */}
      <div className="flex items-center gap-1.5 text-sys-primary/70 group-hover:text-sys-primary text-xs font-mono transition-colors relative z-10">
        <Search size={14} />
        Inspect Node
      </div>
    </div>
  );
}
