import { List, Grid } from "lucide-react";

interface ViewModeToggleProps {
  mode: "list" | "grid";
  onChange: (mode: "list" | "grid") => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
      <button
        onClick={() => onChange("list")}
        className={`p-1.5 rounded-md transition-colors ${
          mode === "list" ? "bg-primary text-background" : "text-text-muted hover:text-text"
        }`}
      >
        <List size={18} />
      </button>
      <button
        onClick={() => onChange("grid")}
        className={`p-1.5 rounded-md transition-colors ${
          mode === "grid" ? "bg-primary text-background" : "text-text-muted hover:text-text"
        }`}
      >
        <Grid size={18} />
      </button>
    </div>
  );
}
