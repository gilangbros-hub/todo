'use client';

import { Loader } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-sys-success/10 text-sys-success border-sys-success/20',
  analyzing: 'bg-sys-primary-container/10 text-sys-primary border-sys-primary-container/20',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  analyzing: 'Processing',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || 'bg-sys-error/10 text-sys-error border-sys-error/20';
  const label = STATUS_LABELS[status] || 'Failed';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {status === 'analyzing' && <Loader size={12} className="animate-spin" />}
      {label}
    </span>
  );
}
