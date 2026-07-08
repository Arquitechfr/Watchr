import { useRef } from "react";

interface FilterChipsProps {
  chips: Array<{ key: string; label: string }>;
  activeChip: string;
  onChipChange: (key: string) => void;
}

export function FilterChips({ chips, activeChip, onChipChange }: FilterChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onChipChange(chip.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeChip === chip.key
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
