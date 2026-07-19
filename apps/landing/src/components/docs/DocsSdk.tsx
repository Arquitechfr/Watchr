import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { cn } from "@/lib/utils";

type Lang = "javascript" | "python" | "go";

const SNIPPETS: Record<Lang, { search: string; add: string }> = {
  javascript: {
    search: `const res = await fetch(
  "https://api.watchr.me/api/public/v1/search?q=breaking+bad",
  { headers: { Authorization: "Bearer wtc_your_key" } }
);
const data = await res.json();
console.log(data.results);`,
    add: `await fetch("https://api.watchr.me/api/public/v1/watchlist", {
  method: "POST",
  headers: {
    Authorization: "Bearer wtc_your_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ tmdbId: 1396, type: "tv" }),
});`,
  },
  python: {
    search: `import requests

res = requests.get(
    "https://api.watchr.me/api/public/v1/search",
    params={"q": "breaking bad"},
    headers={"Authorization": "Bearer wtc_your_key"},
)
data = res.json()
print(data["results"])`,
    add: `import requests

res = requests.post(
    "https://api.watchr.me/api/public/v1/watchlist",
    headers={
        "Authorization": "Bearer wtc_your_key",
        "Content-Type": "application/json",
    },
    json={"tmdbId": 1396, "type": "tv"},
)`,
  },
  go: {
    search: `req, _ := http.NewRequest("GET",
    "https://api.watchr.me/api/public/v1/search?q=breaking+bad", nil)
req.Header.Set("Authorization", "Bearer wtc_your_key")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)
fmt.Println(string(body))`,
    add: `body := strings.NewReader(\`{"tmdbId":1396,"type":"tv"}\`)
req, _ := http.NewRequest("POST",
    "https://api.watchr.me/api/public/v1/watchlist", body)
req.Header.Set("Authorization", "Bearer wtc_your_key")
req.Header.Set("Content-Type", "application/json")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()`,
  },
};

const LANGS: { id: Lang; labelKey: string }[] = [
  { id: "javascript", labelKey: "docs.sdk.javascript" },
  { id: "python", labelKey: "docs.sdk.python" },
  { id: "go", labelKey: "docs.sdk.go" },
];

export function DocsSdk() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Lang>("javascript");

  return (
    <section id="sdk" className="mb-16 scroll-mt-20">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {t("docs.sdk.title")}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        {t("docs.sdk.description")}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {LANGS.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setActive(lang.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active === lang.id
                ? "bg-primary text-background"
                : "border border-border bg-surface text-text-muted hover:text-text",
            )}
          >
            {t(lang.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-3 text-sm font-semibold text-text">
            {t("docs.sdk.searchExample")}
          </h3>
          <CodeBlock code={SNIPPETS[active].search} language={active} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-3 text-sm font-semibold text-text">
            {t("docs.sdk.addExample")}
          </h3>
          <CodeBlock code={SNIPPETS[active].add} language={active} />
        </div>
      </div>
    </section>
  );
}
