import { Check } from "lucide-react";
import { SearchResultItem, getPosterUrl } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface OnboardingPosterTileProps {
  show: SearchResultItem;
  selected: boolean;
  onToggle: () => void;
}

export function OnboardingPosterTile({ show, selected, onToggle }: OnboardingPosterTileProps) {
  const { t } = useI18n();
  const posterUrl = getPosterUrl(show.posterPath, 200);

  return (
    <button
      onClick={onToggle}
      className="relative rounded-lg overflow-hidden border-2 transition-all w-full aspect-[2/3] hover:border-border"
      style={{
        borderColor: selected ? "var(--color-primary)" : "transparent",
      }}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={show.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface">
          <span className="text-text-muted text-xs text-center px-2">{t("common.noImage")}</span>
        </div>
      )}

      {selected && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Check size={16} className="text-background" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-medium truncate">{show.title}</p>
      </div>
    </button>
  );
}
