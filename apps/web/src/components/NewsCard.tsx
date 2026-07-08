import { ExternalLink } from "lucide-react";
import type { NewsArticle } from "../services/news.service";
import { useI18n } from "../i18n/useI18n";
import { format } from "date-fns";

interface NewsCardProps {
  article: NewsArticle;
  onClick: () => void;
}

export function NewsCard({ article, onClick }: NewsCardProps) {
  const { dateFnsLocale } = useI18n();

  const pubDate = article.pubDate ? new Date(article.pubDate) : undefined;

  return (
    <div
      className="bg-surface rounded-lg overflow-hidden cursor-pointer hover:bg-surface-light transition-colors"
      onClick={onClick}
    >
      {article.image && (
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-40 bg-surface-light object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4">
        <p className="text-text font-semibold text-base mb-2 line-clamp-2">{article.title}</p>
        {article.description && (
          <p className="text-text-muted text-sm mb-3 line-clamp-3">
            {article.description.replace(/<[^>]+>/g, "")}
          </p>
        )}
        {pubDate && !Number.isNaN(pubDate.getTime()) && (
          <p className="text-primary text-xs">
            {format(pubDate, "d MMM yyyy", { locale: dateFnsLocale })}
          </p>
        )}
      </div>
    </div>
  );
}
