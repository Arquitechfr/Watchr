import type { ReactNode } from "react";

interface InfoBoxProps {
  icon?: string;
  title: string;
  children: ReactNode;
}

export function InfoBox({ icon, title, children }: InfoBoxProps) {
  return (
    <div className="bg-surface rounded-lg p-4 mb-3 border-l-4 border-primary">
      {icon && <span className="text-xl mr-2">{icon}</span>}
      <h3 className="text-text font-semibold text-sm mb-1 inline">{title}</h3>
      <p className="text-text-muted text-sm mt-1 leading-relaxed">{children}</p>
    </div>
  );
}
