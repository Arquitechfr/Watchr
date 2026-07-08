interface ProgressBarProps {
  watched: number;
  total: number;
  className?: string;
}

export function ProgressBar({ watched, total, className = "" }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min((watched / total) * 100, 100) : 0;

  return (
    <div className={`w-full h-2 bg-surface-light rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
