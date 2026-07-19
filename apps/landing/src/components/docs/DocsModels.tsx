import { useTranslation } from "react-i18next";
import { CodeBlock } from "@/components/shared/CodeBlock";

const SHOW_MODEL = `{
  "tmdbId": 1396,
  "type": "tv",
  "title": "Breaking Bad",
  "posterPath": "/ggFHVNu6YYI5L9pCgMZ9h6n9fUK.jpg",
  "overview": "A high school chemistry teacher...",
  "firstAirDate": "2008-01-20",
  "source": "tmdb"
}`;

const WATCH_ENTRY_MODEL = `{
  "id": "665a1b2c3d4e5f6a7b8c9d0e",
  "userId": "665a0a0b1c2d3e4f5a6b7c8d",
  "showId": "665a1a1b2c3d4e5f6a7b8c9d",
  "status": "watching",
  "watchedEpisodes": [
    { "season": 1, "episode": 1, "watchedAt": "2024-06-01T20:00:00.000Z" }
  ],
  "currentSeason": 1,
  "currentEpisode": 1,
  "show": {
    "tmdbId": 1396,
    "title": "Breaking Bad",
    "posterPath": "/ggFHVNu6YYI5L9pCgMZ9h6n9fUK.jpg",
    "type": "tv",
    "totalEpisodes": 62
  },
  "createdAt": "2024-06-01T18:00:00.000Z",
  "updatedAt": "2024-06-02T20:00:00.000Z"
}`;

const PAGINATION_MODEL = `{
  "page": 1,
  "limit": 20,
  "total": 42,
  "pages": 3
}`;

const SEARCH_RESULT_MODEL = `{
  "results": [
    {
      "tmdbId": 1396,
      "type": "tv",
      "title": "Breaking Bad",
      "posterPath": "/ggFHVNu6YYI5L9pCgMZ9h6n9fUK.jpg",
      "overview": "A high school chemistry teacher...",
      "firstAirDate": "2008-01-20",
      "source": "tmdb"
    }
  ]
}`;

interface ModelDef {
  name: string;
  code: string;
  descKey: string;
}

const MODELS: ModelDef[] = [
  { name: "Show", code: SHOW_MODEL, descKey: "docs.models.showDesc" },
  { name: "WatchEntry", code: WATCH_ENTRY_MODEL, descKey: "docs.models.watchEntryDesc" },
  { name: "Pagination", code: PAGINATION_MODEL, descKey: "docs.models.paginationDesc" },
  { name: "SearchResult", code: SEARCH_RESULT_MODEL, descKey: "docs.models.searchResultDesc" },
];

export function DocsModels() {
  const { t } = useTranslation();

  return (
    <section id="models" className="mb-16 scroll-mt-20">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.models.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.models.description")}
      </p>

      <div className="mt-8 space-y-6">
        {MODELS.map((model) => (
          <div key={model.name} className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-3 flex items-center gap-3">
              <code className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
                {model.name}
              </code>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-text-muted">
              {t(model.descKey)}
            </p>
            <CodeBlock code={model.code} language="JSON" />
          </div>
        ))}
      </div>
    </section>
  );
}
