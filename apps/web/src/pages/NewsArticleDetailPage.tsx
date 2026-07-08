import { useState, useEffect } from "react";
import { ExternalLink, ArrowLeft, Share2, RotateCw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useI18n } from "../i18n/useI18n";
import { format } from "date-fns";
import type { NewsArticle } from "../services/news.service";

export function NewsArticleDetailPage() {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  const articleStr = sessionStorage.getItem("newsArticle");
  const article: NewsArticle | null = articleStr ? JSON.parse(articleStr) : null;

  const state = location.state as { link?: string; title?: string } | null;

  useEffect(() => {
    if (article || state?.link) {
      setIsLoading(false);
    }
  }, [article, state]);

  async function handleShare() {
    if (!article) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          url: article.link,
        });
      } else {
        await navigator.clipboard.writeText(article.link);
      }
    } catch {
      // User dismissed or error
    }
  }

  async function handleOpenInBrowser() {
    if (!article) return;
    try {
      window.open(article.link, "_blank", "noopener,noreferrer");
    } catch {
      // Ignore
    }
  }

  if (!article && !state) {
    return (
      <PageWrapper>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/news")} className="text-text-muted hover:text-text">
            <ArrowLeft size={24} />
          </button>
          <p className="text-text-muted">{t("screens.news.notFound")}</p>
        </div>
      </PageWrapper>
    );
  }

  const displayArticle = article ?? (state ? { link: state.link, title: state.title || "" } as NewsArticle : null);

  if (!displayArticle) {
    return (
      <PageWrapper>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/news")} className="text-text-muted hover:text-text">
            <ArrowLeft size={24} />
          </button>
          <p className="text-text-muted">{t("screens.news.notFound")}</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/news")} className="text-text-muted hover:text-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-text font-bold text-xl flex-1 truncate">{displayArticle.title}</h1>
        <button
          onClick={handleShare}
          className="ml-3 text-text-muted hover:text-text transition-colors"
          title={t("common.share")}
        >
          <Share2 size={22} />
        </button>
        <button
          onClick={handleOpenInBrowser}
          className="ml-3 text-text-muted hover:text-text transition-colors"
          title={t("screens.news.openInBrowser")}
        >
          <ExternalLink size={22} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <RotateCw size={32} className="text-primary animate-spin mx-auto mb-3" />
            <p className="text-text-muted text-sm">{t("screens.news.loadingArticle")}</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {displayArticle.image && (
            <img
              src={displayArticle.image}
              alt={displayArticle.title}
              className="w-full h-48 sm:h-64 rounded-lg object-cover mb-4"
              loading="lazy"
            />
          )}

          <h2 className="text-text font-bold text-lg mb-2">{displayArticle.title}</h2>

          {displayArticle.pubDate && (
            <p className="text-text-muted text-sm mb-3">
              {format(new Date(displayArticle.pubDate), "PP", { locale: dateFnsLocale })}
            </p>
          )}

          {displayArticle.description && (
            <p className="text-text text-sm whitespace-pre-wrap mb-4">{displayArticle.description}</p>
          )}

          <a
            href={displayArticle.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <ExternalLink size={16} />
            {t("screens.news.readOriginal")}
          </a>
        </>
      )}
    </PageWrapper>
  );
}
