import { useTranslation } from "react-i18next";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { cn } from "@/lib/utils";

interface EndpointData {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  scope: "read" | "write";
  titleKey: string;
  descKey: string;
  curl: string;
  response: string;
  responseStatus: string;
}

const ENDPOINTS: EndpointData[] = [
  {
    method: "GET",
    path: "/api/public/v1/search?q={query}",
    scope: "read",
    titleKey: "docs.endpoints.search.title",
    descKey: "docs.endpoints.search.description",
    curl: `curl -H "Authorization: Bearer wtc_your_key" \\
  "https://api.watchr.me/api/public/v1/search?q=breaking+bad"`,
    response: `{
  "results": [
    {
      "tmdbId": 1396,
      "type": "tv",
      "title": "Breaking Bad",
      "posterPath": "/ggFHVNu6YYI5L9pCgMZ9h6n9fUK.jpg",
      "overview": "A high school chemistry teacher...",
      "firstAirDate": "2008-01-20",
      "source": "tmdb"
    },
    {
      "tmdbId": 86689,
      "type": "movie",
      "title": "Breaking Bad: The Movie",
      "posterPath": "/example.jpg",
      "overview": "A fan-made film adaptation...",
      "firstAirDate": "2017-01-01",
      "source": "tmdb"
    }
  ]
}`,
    responseStatus: "200 OK",
  },
  {
    method: "GET",
    path: "/api/public/v1/watchlist?page=1&limit=20",
    scope: "read",
    titleKey: "docs.endpoints.getWatchlist.title",
    descKey: "docs.endpoints.getWatchlist.description",
    curl: `curl -H "Authorization: Bearer wtc_your_key" \\
  "https://api.watchr.me/api/public/v1/watchlist?page=1&limit=20"`,
    response: `{
  "data": [
    {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "showId": "665a1a1b2c3d4e5f6a7b8c9d",
      "userId": "665a0a0b1c2d3e4f5a6b7c8d",
      "status": "watching",
      "watchedEpisodes": [
        { "season": 1, "episode": 1, "watchedAt": "2024-06-01T20:00:00.000Z" },
        { "season": 1, "episode": 2, "watchedAt": "2024-06-02T20:00:00.000Z" }
      ],
      "currentSeason": 1,
      "currentEpisode": 2,
      "show": {
        "tmdbId": 1396,
        "title": "Breaking Bad",
        "posterPath": "/ggFHVNu6YYI5L9pCgMZ9h6n9fUK.jpg",
        "type": "tv",
        "totalEpisodes": 62
      },
      "createdAt": "2024-06-01T18:00:00.000Z",
      "updatedAt": "2024-06-02T20:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}`,
    responseStatus: "200 OK",
  },
  {
    method: "POST",
    path: "/api/public/v1/watchlist",
    scope: "write",
    titleKey: "docs.endpoints.postWatchlist.title",
    descKey: "docs.endpoints.postWatchlist.description",
    curl: `curl -X POST \\
  -H "Authorization: Bearer wtc_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"tmdbId": 1396, "type": "tv"}' \\
  "https://api.watchr.me/api/public/v1/watchlist"`,
    // TODO: The POST endpoint returns a raw Mongoose WatchEntry document (no populate).
    // Fields like __v, _id as ObjectId, currentSeason/currentEpisode may be absent
    // since they are not set during creation. This example is based on the schema
    // but exact field presence is not 100% verified from runtime.
    response: `{
  "_id": "665a1b2c3d4e5f6a7b8c9d0e",
  "userId": "665a0a0b1c2d3e4f5a6b7c8d",
  "showId": "665a1a1b2c3d4e5f6a7b8c9d",
  "status": "plan_to_watch",
  "watchedEpisodes": [],
  "createdAt": "2024-06-01T18:00:00.000Z",
  "updatedAt": "2024-06-01T18:00:00.000Z",
  "__v": 0
}`,
    responseStatus: "201 Created",
  },
  {
    method: "PATCH",
    path: "/api/public/v1/watchlist/:showId",
    scope: "write",
    titleKey: "docs.endpoints.patchWatchlist.title",
    descKey: "docs.endpoints.patchWatchlist.description",
    curl: `curl -X PATCH \\
  -H "Authorization: Bearer wtc_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "completed"}' \\
  "https://api.watchr.me/api/public/v1/watchlist/665a1a1b2c3d4e5f6a7b8c9d"`,
    // TODO: Same as POST — returns raw Mongoose document from findOneAndUpdate.
    // Exact field set depends on what was $set in the update.
    response: `{
  "_id": "665a1b2c3d4e5f6a7b8c9d0e",
  "userId": "665a0a0b1c2d3e4f5a6b7c8d",
  "showId": "665a1a1b2c3d4e5f6a7b8c9d",
  "status": "completed",
  "watchedEpisodes": [
    { "season": 1, "episode": 1, "watchedAt": "2024-06-01T20:00:00.000Z" }
  ],
  "currentSeason": 1,
  "currentEpisode": 1,
  "createdAt": "2024-06-01T18:00:00.000Z",
  "updatedAt": "2024-06-03T21:00:00.000Z",
  "__v": 0
}`,
    responseStatus: "200 OK",
  },
  {
    method: "DELETE",
    path: "/api/public/v1/watchlist/:showId",
    scope: "write",
    titleKey: "docs.endpoints.deleteWatchlist.title",
    descKey: "docs.endpoints.deleteWatchlist.description",
    curl: `curl -X DELETE \\
  -H "Authorization: Bearer wtc_your_key" \\
  "https://api.watchr.me/api/public/v1/watchlist/665a1a1b2c3d4e5f6a7b8c9d"`,
    response: ``,
    responseStatus: "204 No Content",
  },
];

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-success/15 text-success",
  POST: "bg-info/15 text-info",
  PATCH: "bg-warning/15 text-warning",
  DELETE: "bg-danger/15 text-danger",
};

function EndpointCard({ endpoint }: { endpoint: EndpointData }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-bold",
            METHOD_STYLES[endpoint.method],
          )}
        >
          {endpoint.method}
        </span>
        <code className="font-mono text-sm text-text">{endpoint.path}</code>
        <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-text-muted">
          {endpoint.scope}
        </span>
      </div>

      <h3 className="mt-4 text-base font-semibold text-text">
        {t(endpoint.titleKey)}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-text-muted">
        {t(endpoint.descKey)}
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-text-muted">
            {t("docs.endpoints.requestLabel")}
          </p>
          <CodeBlock code={endpoint.curl} language="bash" />
        </div>
        {endpoint.response ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-muted">
              {t("docs.endpoints.responseLabel")} — {endpoint.responseStatus}
            </p>
            <CodeBlock code={endpoint.response} language="JSON" />
          </div>
        ) : (
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-muted">
              {t("docs.endpoints.responseLabel")} — {endpoint.responseStatus}
            </p>
            <div className="rounded-xl border border-border bg-surface-light/50 p-4 text-sm text-text-muted">
              {t("docs.endpoints.noContent")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocsEndpoints() {
  const { t } = useTranslation();

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.endpoints.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.endpoints.description")}
      </p>

      <div className="mt-8 space-y-6">
        {ENDPOINTS.map((endpoint) => (
          <EndpointCard key={endpoint.method + endpoint.path} endpoint={endpoint} />
        ))}
      </div>
    </section>
  );
}
