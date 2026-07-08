import { useRef } from "react";

export interface FilterChipOption {
  label: string;
  value: string | number;
}

interface FilterChipsProps {
  chips: FilterChipOption[];
  activeChip: string | number | undefined;
  onChipChange: (value: string | number | undefined) => void;
  allLabel?: string;
  showAllOption?: boolean;
}

export function FilterChips({ chips, activeChip, onChipChange, allLabel = "All", showAllOption = false }: FilterChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {showAllOption && (
        <button
          onClick={() => onChipChange(undefined)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeChip === undefined
              ? "bg-primary text-background"
              : "bg-surface text-text-muted hover:text-text"
          }`}
        >
          {allLabel}
        </button>
      )}
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChipChange(chip.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeChip === chip.value
              ? "bg-primary text-background"
              : "bg-surface text-text-muted hover:text-text"
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
