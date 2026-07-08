import { Tv, Film, Clock, MessageSquare, Heart } from "lucide-react";

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "tv-outline": <Tv size={18} />,
  "film-outline": <Film size={18} />,
  "play-circle-outline": <Clock size={18} />,
  "time-outline": <Clock size={18} />,
  "chatbubble-outline": <MessageSquare size={18} />,
  "heart-outline": <Heart size={18} />,
};

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="bg-surface rounded-lg p-3 flex-1 flex flex-col items-center text-center" style={{ minHeight: 90 }}>
      <div className="text-primary mb-2">{ICON_MAP[icon] || null}</div>
      <p className="text-text font-bold text-xl">{value}</p>
      <p className="text-text-muted text-xs mt-1 line-clamp-2">{label}</p>
    </div>
  );
}
