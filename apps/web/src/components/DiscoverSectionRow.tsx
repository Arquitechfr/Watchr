import { ShowCard } from "./ShowCard";
import type { SearchResultItem, DiscoverSection } from "../services/shows.service";

interface DiscoverSectionRowProps {
  section: DiscoverSection;
  onShowPress: (show: SearchResultItem) => void;
  onQuickAdd: (show: SearchResultItem) => void;
  isAdding: boolean;
  isTracked: (tmdbId: number) => boolean;
}

export function DiscoverSectionRow({ section, onShowPress, onQuickAdd, isAdding, isTracked }: DiscoverSectionRowProps) {
  if (section.items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-text font-semibold text-sm mb-2">{section.title}</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {section.items.map((item) => (
          <div key={item.tmdbId} className="w-48 shrink-0">
            <ShowCard
              show={item}
              onPress={() => onShowPress(item)}
              onQuickAdd={() => onQuickAdd(item)}
              isTracked={item.tmdbId ? isTracked(item.tmdbId) : false}
              isAdding={isAdding}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
