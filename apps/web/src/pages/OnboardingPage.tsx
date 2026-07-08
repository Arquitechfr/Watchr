import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useShowSearch } from "../hooks/useShowSearch";
import { useQuickAddToWatchlist } from "../hooks/useTracking";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import { getPosterUrl } from "../services/shows.service";
import type { SearchResultItem } from "../services/shows.service";

export function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSnackbar } = useUIStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: searchResult, isLoading } = useShowSearch(query);
  const quickAdd = useQuickAddToWatchlist();

  function toggleSelect(tmdbId: number, type: "tv" | "movie") {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tmdbId)) {
        next.delete(tmdbId);
      } else {
        next.add(tmdbId);
        quickAdd.mutate({ tmdbId, type });
      }
      return next;
    });
  }

  function handleFinish() {
    if (selected.size > 0) {
      showSnackbar(t("screens.onboarding.addedShows", { count: selected.size }), "success");
    }
    navigate("/series");
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-text font-bold text-2xl mb-2">{t("screens.onboarding.welcome")}</h1>
        <p className="text-text-muted text-sm">{t("screens.onboarding.selectShows")}</p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("screens.search.placeholder")}
        autoFocus
        className="w-full bg-surface text-text placeholder:text-text-muted rounded-lg px-4 py-3 text-sm border border-border focus:outline-none focus:border-primary transition-colors mb-4"
      />

      {isLoading && (
        <p className="text-text-muted text-sm text-center py-4">{t("common.loading")}</p>
      )}

      {searchResult && searchResult.results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {searchResult.results.map((item: SearchResultItem) => (
            <button
              key={item.tmdbId}
              onClick={() => item.tmdbId && toggleSelect(item.tmdbId, item.type)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                selected.has(item.tmdbId ?? 0)
                  ? "border-primary"
                  : "border-transparent hover:border-border"
              }`}
            >
              {item.posterPath && (
                <img
                  src={getPosterUrl(item.posterPath, 200)}
                  alt={item.title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-xs font-medium truncate">{item.title}</p>
                <p className="text-white/60 text-xs">
                  {item.type === "tv" ? t("common.series") : t("common.movie")}
                </p>
              </div>
              {selected.has(item.tmdbId ?? 0) && (
                <div className="absolute top-2 right-2 bg-primary text-background rounded-full p-1">
                  <Check size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleFinish}
        className="w-full bg-primary text-background py-3 rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors"
      >
        {selected.size > 0
          ? t("screens.onboarding.finishWithCount", { count: selected.size })
          : t("screens.onboarding.skip")}
      </button>
    </PageWrapper>
  );
}
