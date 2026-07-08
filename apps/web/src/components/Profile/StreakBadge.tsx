import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <div className="flex items-center gap-2 bg-orange-500/20 text-orange-500 px-3 py-1.5 rounded-full">
      <Flame size={18} />
      <span className="font-semibold text-sm">{streak} days</span>
    </div>
  );
}
