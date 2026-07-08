import { useState, useEffect } from "react";
import { Inbox } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { FilterChips, FilterChipOption } from "../components/FilterChips";
import { NewsCard } from "../components/NewsCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useNews, useNewsSources } from "../hooks/useNews";
import { useNewsRealtime } from "../hooks/useNewsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useI18n } from "../i18n/useI18n";
import { useLocaleStore } from "../store/localeStore";
import type { NewsSource, NewsArticle } from "../services/news.service";

export function NewsPage() {
  const { t } = useI18n();
  const locale = useLocaleStore((state) => state.locale);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { data: sources, isLoading: isLoadingSources } = useNewsSources();
  const { data: articles, isLoading: isLoadingArticles, isError: isErrorArticles, error, refetch } = useNews(selectedSource);

  const throttledRefresh = useRefreshRateLimit();

  useEffect(() => {
    setSelectedSource(null);
  }, [locale]);

  useEffect(() => {
    if (sources && sources.length > 0 && selectedSource === null) {
      setSelectedSource(sources[0].id);
    }
  }, [sources, selectedSource]);

  useNewsRealtime();

  const chips: FilterChipOption[] = sources?.map((s: NewsSource) => ({ label: s.name, value: s.id })) ?? [];

  const filteredArticles = articles;

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
            activeChip={selectedSource ?? undefined}
            onChipChange={(v) => setSelectedSource((v as string | undefined) ?? null)}
            allLabel={t("common.all")}
            showAllOption
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
      {isErrorArticles && (
        <NetworkError onRetry={() => throttledRefresh(refetch)} />
      )}
      {!isLoadingArticles && !isErrorArticles && (!filteredArticles || filteredArticles.length === 0) && (
        <EmptyState icon={Inbox} title={t("screens.news.empty")} subtitle={t("screens.news.emptySubtitle")} />
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
