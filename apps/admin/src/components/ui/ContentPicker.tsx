import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2, Film, Tv } from "lucide-react";
import api from "../../lib/api";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TmdbSearchResult {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
}

interface EpisodeResult {
  episodeNumber: number;
  name: string | null;
  airDate: string | null;
  stillPath: string | null;
}

interface ContentPickerProps {
  screenType: "show" | "episode" | "comments";
  onSelect: (params: Record<string, unknown>) => void;
}

export function ContentPicker({ screenType, onSelect }: ContentPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedShow, setSelectedShow] = useState<TmdbSearchResult | null>(null);
  const [seasonNumber, setSeasonNumber] = useState<string>("");
  const [episodes, setEpisodes] = useState<EpisodeResult[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeResult | null>(null);
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
        const { data } = await api.get("/admin/tmdb/search", {
          params: { q: query, type: "multi" },
        });
        setResults(data.results ?? []);
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

  useEffect(() => {
    if (!selectedShow || !seasonNumber || screenType === "show") return;
    setLoadingEpisodes(true);
    setSelectedEpisode(null);
    api
      .get(`/admin/tmdb/season/${selectedShow.tmdbId}/${seasonNumber}`)
      .then((res: { data: { episodes: EpisodeResult[] } }) => {
        setEpisodes(res.data.episodes ?? []);
      })
      .catch(() => setEpisodes([]))
      .finally(() => setLoadingEpisodes(false));
  }, [selectedShow, seasonNumber, screenType]);

  function handleShowSelect(show: TmdbSearchResult) {
    setSelectedShow(show);
    setQuery("");
    setShowResults(false);
    setSeasonNumber("");
    setEpisodes([]);
    setSelectedEpisode(null);

    if (screenType === "show") {
      onSelect({ tmdbId: show.tmdbId });
    }
  }

  function handleEpisodeSelect(ep: EpisodeResult) {
    setSelectedEpisode(ep);
    if (screenType === "episode" && selectedShow) {
      onSelect({
        showId: String(selectedShow.tmdbId),
        tmdbId: selectedShow.tmdbId,
        season: Number(seasonNumber),
        episodeNumber: ep.episodeNumber,
      });
    } else if (screenType === "comments" && selectedShow) {
      onSelect({
        showId: String(selectedShow.tmdbId),
        season: Number(seasonNumber),
        episode: ep.episodeNumber,
      });
    }
  }

  function handleReset() {
    setSelectedShow(null);
    setSeasonNumber("");
    setEpisodes([]);
    setSelectedEpisode(null);
  }

  if (selectedShow) {
    return (
      <div className="space-y-2 pl-2 border-l-2 border-border ml-1">
        <div className="flex items-center gap-2">
          {selectedShow.posterPath ? (
            <img
              src={`${TMDB_IMAGE_BASE}/w92${selectedShow.posterPath}`}
              alt={selectedShow.title}
              className="w-8 h-12 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-12 rounded bg-background flex items-center justify-center flex-shrink-0">
              {selectedShow.type === "movie" ? <Film size={14} className="text-text-muted" /> : <Tv size={14} className="text-text-muted" />}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-text font-medium text-sm truncate">{selectedShow.title}</span>
            <span className="text-text-muted text-xs">{selectedShow.type === "tv" ? "TV Series" : "Movie"} • TMDB ID: {selectedShow.tmdbId}</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-text-muted hover:text-text"
          >
            <X size={14} />
          </button>
        </div>

        {screenType !== "show" && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Season</label>
              <input
                type="number"
                min={0}
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(e.target.value)}
                placeholder="Season number"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text"
              />
            </div>
            {loadingEpisodes && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Loader2 size={12} className="animate-spin" /> Loading episodes...
              </div>
            )}
            {!loadingEpisodes && episodes.length > 0 && (
              <div>
                <label className="text-xs text-text-muted mb-1 block">Episode</label>
                <select
                  value={selectedEpisode?.episodeNumber ?? ""}
                  onChange={(e) => {
                    const ep = episodes.find((ep) => ep.episodeNumber === Number(e.target.value));
                    if (ep) handleEpisodeSelect(ep);
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text"
                >
                  <option value="">Select episode</option>
                  {episodes.map((ep) => (
                    <option key={ep.episodeNumber} value={ep.episodeNumber}>
                      E{ep.episodeNumber}{ep.name ? ` — ${ep.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!loadingEpisodes && seasonNumber && episodes.length === 0 && (
              <div className="text-xs text-text-muted">No episodes found for this season.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search show/movie on TMDB..."
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
            <div className="px-3 py-2 text-sm text-text-muted">No results found</div>
          ) : (
            results.slice(0, 8).map((show) => (
              <button
                key={`${show.tmdbId}-${show.type}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleShowSelect(show); }}
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
                    {show.type === "movie" ? <Film size={14} className="text-text-muted" /> : <Tv size={14} className="text-text-muted" />}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-text font-medium truncate">{show.title}</span>
                  <span className="text-text-muted text-xs">
                    {show.type === "tv" ? "TV Series" : "Movie"}
                    {show.releaseDate ? ` • ${show.releaseDate.slice(0, 4)}` : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
