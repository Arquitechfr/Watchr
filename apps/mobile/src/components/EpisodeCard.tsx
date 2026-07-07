import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPosterUrl } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface EpisodeCardProps {
  posterPath?: string;
  title: string;
  season: number;
  episode: number;
  episodeName?: string;
  isNew?: boolean;
  network?: string;
  onPress: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
  width?: number;
}

const DEFAULT_CARD_WIDTH = 128;
const DEFAULT_CARD_HEIGHT = 192;

export function EpisodeCard({
  posterPath,
  title,
  season,
  episode,
  episodeName,
  isNew,
  network,
  onPress,
  onMarkWatched,
  isMarking,
  width,
}: EpisodeCardProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(posterPath, 200);

  const cardWidth = width ?? DEFAULT_CARD_WIDTH;
  const cardHeight = width ? Math.round(width * 1.5) : DEFAULT_CARD_HEIGHT;

  const seasonEpisodeLabel = `S${String(season).padStart(2, "0")} - E${String(episode).padStart(2, "0")}`;

  return (
    <View style={{ width: cardWidth }}>
      <TouchableOpacity
        style={{
          width: cardWidth,
          height: cardHeight,
          borderRadius: 8,
          backgroundColor: colors.surfaceLight,
          overflow: "hidden",
        }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={{ width: cardWidth, height: cardHeight }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: cardWidth, height: cardHeight, alignItems: "center", justifyContent: "center" }}>
            <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
          </View>
        )}
      </TouchableOpacity>

      {onMarkWatched && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={onMarkWatched}
          disabled={isMarking}
          activeOpacity={0.7}
        >
          {isMarking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      )}

      <View className="mt-2 px-1">
        <View className="bg-surface-light rounded-full px-2 py-0.5 self-start mb-1">
          <Text className="text-text text-xs font-medium" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text className="text-text font-bold text-sm" numberOfLines={1}>
          {seasonEpisodeLabel}
        </Text>
        {episodeName ? (
          <Text className="text-text-muted text-xs mt-0.5" numberOfLines={1}>
            {episodeName}
          </Text>
        ) : null}
        {isNew ? (
          <View className="bg-primary rounded-full px-1.5 py-0.5 self-start mt-1">
            <Text className="text-background text-xs font-semibold">
              {t("common.newEpisode")}
            </Text>
          </View>
        ) : null}
        {network ? (
          <Text className="text-text-muted text-xs mt-1" numberOfLines={1}>
            {t("common.platform")} {network}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
