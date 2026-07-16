import { SearchResultItem } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";
import { MediaRow } from "./MediaRow";

interface ShowCardProps {
  show: SearchResultItem;
  onPress: () => void;
}

export function ShowCard({ show, onPress }: ShowCardProps) {
  const { t } = useI18n();

  const subtitle = [
    show.firstAirDate ? new Date(show.firstAirDate).getFullYear().toString() : "—",
    show.type === "tv" ? t("common.tv") : t("common.movie"),
  ].join(" · ");

  return (
    <MediaRow
      posterPath={show.posterPath}
      title={show.title}
      subtitle={subtitle}
      onPress={onPress}
      posterWidth={80}
      posterHeight={112}
    />
  );
}
