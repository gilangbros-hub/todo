import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ icon: Icon, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sys-primary-container/20 flex items-center justify-center text-sys-primary shrink-0 mt-0.5">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="font-outfit font-black text-2xl text-sys-text tracking-tight">{title}</h2>
          {subtitle && <p className="font-geist text-base text-sys-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
