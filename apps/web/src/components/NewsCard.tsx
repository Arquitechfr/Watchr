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

  return (
    <div
      className="flex gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
      onClick={onClick}
    >
      {article.image && (
        <img
          src={article.image}
          alt={article.title}
          className="w-20 h-20 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium text-sm line-clamp-2">{article.title}</p>
        {article.pubDate && (
          <p className="text-text-muted text-xs mt-1">
            {format(new Date(article.pubDate), "PP", { locale: dateFnsLocale })}
          </p>
        )}
        {article.description && (
          <p className="text-text-muted text-xs mt-1 line-clamp-2">{article.description}</p>
        )}
      </div>
      <ExternalLink size={16} className="text-text-muted shrink-0 self-center" />
    </div>
  );
}
