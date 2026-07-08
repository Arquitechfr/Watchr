interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse bg-surface-light rounded-lg ${className}`} />;
}

export function ShowCardSkeleton() {
  return (
    <div className="flex gap-3 bg-surface rounded-lg p-3">
      <div className="w-12 h-18 rounded-md bg-surface-light shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-3/4 bg-surface-light rounded mb-2 animate-pulse" />
        <div className="h-3 w-1/2 bg-surface-light rounded animate-pulse" />
      </div>
    </div>
  );
}
