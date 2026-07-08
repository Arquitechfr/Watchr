import { useState } from "react";
import { Inbox } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { FilterChips } from "../components/FilterChips";
import { NewsCard } from "../components/NewsCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useNews, useNewsSources } from "../hooks/useNews";
import { useNewsRealtime } from "../hooks/useNewsRealtime";
import { useI18n } from "../i18n/useI18n";
import type { NewsSource, NewsArticle } from "../services/news.service";

export function NewsPage() {
  const { t } = useI18n();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { data: sources, isLoading: isLoadingSources } = useNewsSources();
  const { data: articles, isLoading: isLoadingArticles, isError: isErrorArticles, refetch } = useNews(selectedSource);

  useNewsRealtime();

  const chips = [{ key: "all", label: t("common.all") }];
  sources?.forEach((s: NewsSource) => chips.push({ key: s.id, label: s.name }));

  const filteredArticles = selectedSource === null
    ? articles
    : articles;

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <h1 className="text-text font-bold text-2xl mb-4">{t("navigation.news")}</h1>

      <div className="mb-4">
        {isLoadingSources ? (
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        ) : (
          <FilterChips
            chips={chips}
            activeChip={selectedSource ?? "all"}
            onChipChange={(key) => setSelectedSource(key === "all" ? null : key)}
          />
        )}
      </div>

      {isLoadingArticles && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {isErrorArticles && <NetworkError onRetry={refetch} />}
      {!isLoadingArticles && !isErrorArticles && (!filteredArticles || filteredArticles.length === 0) && (
        <EmptyState icon={Inbox} title={t("screens.news.empty")} />
      )}
      {!isLoadingArticles && !isErrorArticles && filteredArticles && filteredArticles.length > 0 && (
        <div className="space-y-2">
          {filteredArticles.map((article: NewsArticle, i: number) => (
            <NewsCard
              key={i}
              article={article}
              onClick={() => {
                sessionStorage.setItem("newsArticle", JSON.stringify(article));
                window.location.href = "/#/news/article";
              }}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
