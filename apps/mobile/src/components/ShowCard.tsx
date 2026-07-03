import { View, Text, Image, TouchableOpacity } from "react-native";
import { SearchResultItem, getPosterUrl } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface ShowCardProps {
  show: SearchResultItem;
  onPress: () => void;
}

export function ShowCard({ show, onPress }: ShowCardProps) {
  const { t } = useI18n();
  const posterUrl = getPosterUrl(show.posterPath, 200);

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface rounded-lg p-3 mb-3 active:opacity-70"
      onPress={onPress}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-20 h-28 rounded-lg bg-surface-light"
          resizeMode="cover"
        />
      ) : (
        <View className="w-20 h-28 rounded-lg bg-surface-light items-center justify-center">
          <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="text-text font-semibold text-base mb-1" numberOfLines={2}>
          {show.title}
        </Text>
        <Text className="text-text-muted text-sm">
          {show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : "—"}
          {" · "}
          {show.type === "tv" ? t("common.tv") : t("common.movie")}
          {show.source === "tvdb" ? " · TVDB" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
