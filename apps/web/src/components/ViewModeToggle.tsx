import { List, Grid } from "lucide-react";
import { useUIStore } from "../store/uiStore";

export function ViewModeToggle() {
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);
  const setLibraryViewMode = useUIStore((state) => state.setLibraryViewMode);

  return (
    <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
      <button
        onClick={() => setLibraryViewMode("list")}
        className={`p-1.5 rounded-md transition-colors ${
          libraryViewMode === "list" ? "bg-primary text-background" : "text-text-muted hover:text-text"
        }`}
      >
        <List size={18} />
      </button>
      <button
        onClick={() => setLibraryViewMode("grid")}
        className={`p-1.5 rounded-md transition-colors ${
          libraryViewMode === "grid" ? "bg-primary text-background" : "text-text-muted hover:text-text"
        }`}
      >
        <Grid size={18} />
      </button>
    </div>
  );
}
