import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Icon size={48} className="text-text-muted mb-4" />
      <p className="text-text font-semibold text-lg mb-1">{title}</p>
      {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
    </div>
  );
}
