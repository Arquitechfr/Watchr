import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2, Film } from "lucide-react";
import api from "../../lib/api";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface ShowResult {
  id: string;
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
}

interface ShowPickerProps {
  onSelect: (posterUrl: string) => void;
  label?: string;
}

export function ShowPicker({ onSelect, label = "Use show poster" }: ShowPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShowResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/shows", {
          params: { search: query, page: 1, limit: 5 },
        });
        setResults(data.shows ?? []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback((show: ShowResult) => {
    if (show.posterPath) {
      const posterUrl = `${TMDB_IMAGE_BASE}/w500${show.posterPath}`;
      onSelect(posterUrl);
    }
    setQuery("");
    setShowResults(false);
  }, [onSelect]);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm text-text-muted">{label}</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a show..."
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          onBlur={() => { setTimeout(() => setShowResults(false), 200); }}
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-text"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-muted" />
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(""); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {showResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-lg max-h-64 overflow-auto">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-muted">No shows found</div>
          ) : (
            results.map((show) => (
              <button
                key={show.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(show); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-background transition-colors"
              >
                {show.posterPath ? (
                  <img
                    src={`${TMDB_IMAGE_BASE}/w92${show.posterPath}`}
                    alt={show.title}
                    className="w-8 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 rounded bg-background flex items-center justify-center flex-shrink-0">
                    <Film size={14} className="text-text-muted" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-text font-medium truncate">{show.title}</span>
                  <span className="text-text-muted text-xs">{show.type === "tv" ? "TV Series" : "Movie"}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
