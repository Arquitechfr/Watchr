import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShowCard } from "./ShowCard";
import type { SearchResultItem } from "../services/shows.service";

interface DiscoverSectionRowProps {
  title: string;
  items: SearchResultItem[];
  onCardClick?: (item: SearchResultItem) => void;
}

export function DiscoverSectionRow({ title, items, onCardClick }: DiscoverSectionRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text font-semibold text-sm">{title}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1 text-text-muted hover:text-text"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1 text-text-muted hover:text-text"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.map((item, i) => (
          <div key={`${item.tmdbId ?? i}`} className="w-64 shrink-0">
            <ShowCard item={item} onQuickAdd={() => onCardClick?.(item)} />
          </div>
        ))}
      </div>
    </div>
  );
}
