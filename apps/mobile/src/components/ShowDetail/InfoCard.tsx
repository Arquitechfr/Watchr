import { View, Text } from "react-native";
import { useI18n } from "../../i18n/useI18n";
import type { WatchStatus } from "../../services/tracking.service";
import type { Network } from "../../services/shows.service";

interface InfoCardProps {
  trackingStatus?: WatchStatus | null;
  tmdbStatus?: string;
  type: "tv" | "movie";
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  runtime?: number;
  voteAverage?: number;
  voteCount?: number;
  networks?: Network[];
}

export function InfoCard({
  trackingStatus,
  tmdbStatus,
  type,
  numberOfSeasons,
  numberOfEpisodes,
  runtime,
  voteAverage,
  voteCount,
  networks,
}: InfoCardProps) {
  const { t } = useI18n();

  const getTmdbStatusLabel = (status: string): string => {
    const key = status.replace(/\s+/g, "").replace(/-/g, "");
    const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
    const translation = t(`tmdbStatus.${lowerKey}`);
    return translation !== `tmdbStatus.${lowerKey}` ? translation : status;
  };

  const getStatusLabel = (status: WatchStatus): string => {
    switch (status) {
      case "watching":
        return t("screens.showDetail.inProgress");
      case "completed":
        return t("screens.showDetail.completed");
      case "plan_to_watch":
        return t("screens.showDetail.planToWatch");
      case "dropped":
        return t("screens.showDetail.dropped");
    }
  };

  return (
    <View className="bg-surface rounded-lg p-4 mb-6">
      <View className="flex-row flex-wrap justify-between">
        {trackingStatus && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.tracking")}</Text>
            <Text className="text-text font-medium">{getStatusLabel(trackingStatus)}</Text>
          </View>
        )}
        {tmdbStatus && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.status")}</Text>
            <Text className="text-text font-medium">{getTmdbStatusLabel(tmdbStatus)}</Text>
          </View>
        )}
        {type === "tv" && numberOfSeasons !== undefined && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.seasons")}</Text>
            <Text className="text-text font-medium">{numberOfSeasons}</Text>
          </View>
        )}
        {type === "tv" && numberOfEpisodes !== undefined && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.episodes")}</Text>
            <Text className="text-text font-medium">{numberOfEpisodes}</Text>
          </View>
        )}
        {runtime && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.duration")}</Text>
            <Text className="text-text font-medium">{runtime} {t("common.minutesShort")}</Text>
          </View>
        )}
        {voteAverage !== undefined && voteCount !== undefined && voteCount > 0 && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.tmdbRating")}</Text>
            <Text className="text-text font-medium">{voteAverage.toFixed(1)}/10</Text>
          </View>
        )}
        {networks && networks.length > 0 && (
          <View className="w-1/2 mb-3 pr-2">
            <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.network")}</Text>
            <Text className="text-text font-medium">{networks.map((n) => n.name).join(", ")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
