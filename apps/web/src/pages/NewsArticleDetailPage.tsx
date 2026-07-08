import { ExternalLink, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useI18n } from "../i18n/useI18n";
import { format } from "date-fns";
import type { NewsArticle } from "../services/news.service";

export function NewsArticleDetailPage() {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();

  const articleStr = sessionStorage.getItem("newsArticle");
  const article: NewsArticle | null = articleStr ? JSON.parse(articleStr) : null;

  if (!article) {
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
        <h1 className="text-text font-bold text-xl flex-1">{t("navigation.news")}</h1>
      </div>

      {article.image && (
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-48 sm:h-64 rounded-lg object-cover mb-4"
        />
      )}

      <h2 className="text-text font-bold text-lg mb-2">{article.title}</h2>

      {article.pubDate && (
        <p className="text-text-muted text-sm mb-3">
          {format(new Date(article.pubDate), "PP", { locale: dateFnsLocale })}
        </p>
      )}

      {article.description && (
        <p className="text-text text-sm whitespace-pre-wrap mb-4">{article.description}</p>
      )}

      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        <ExternalLink size={16} />
        {t("screens.news.readOriginal")}
      </a>
    </PageWrapper>
  );
}
