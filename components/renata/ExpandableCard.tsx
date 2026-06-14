'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableCardProps {
  children: React.ReactNode;
  expandedContent: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function ExpandableCard({ children, expandedContent, badge, className = '' }: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-sys-surface border border-sys-border rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <div className="w-8 h-8 rounded-full bg-sys-bg flex items-center justify-center text-sys-muted hover:bg-sys-primary-container/20 hover:text-sys-primary transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-sys-border px-5 py-4 bg-sys-bg/50 rounded-b-2xl animate-fade-in-up">
          {expandedContent}
        </div>
      )}
    </div>
  );
}
