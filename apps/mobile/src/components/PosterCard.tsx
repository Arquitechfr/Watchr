import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SearchResultItem, getPosterUrl } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { ProgressBar } from "./ProgressBar";

interface PosterCardProps {
  show: SearchResultItem;
  onPress: () => void;
  onAdd?: () => void;
  isAdding?: boolean;
  isAdded?: boolean;
  watched?: number;
  total?: number;
}

const CARD_WIDTH = 128;
const CARD_HEIGHT = 192;

export function PosterCard({ show, onPress, onAdd, isAdding, isAdded, watched, total }: PosterCardProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(show.posterPath, 200);
  const year = show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : null;

  return (
    <View style={{ width: CARD_WIDTH, marginRight: 12 }}>
      <TouchableOpacity
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
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
            style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, alignItems: "center", justifyContent: "center" }}>
            <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
          </View>
        )}
      </TouchableOpacity>

      {onAdd && !isAdded && (
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
          onPress={onAdd}
          disabled={isAdding}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

      {isAdded && (
        <View
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
        >
          <Ionicons name="checkmark" size={20} color={colors.success} />
        </View>
      )}

      <View className="mt-2 px-1">
        <Text className="text-text text-sm font-medium" numberOfLines={2}>
          {show.title}
        </Text>
        <Text className="text-text-muted text-xs mt-0.5">
          {year ? year : "—"}
          {" · "}
          {show.type === "tv" ? t("common.tv") : t("common.movie")}
        </Text>
        {show.type === "tv" && watched !== undefined && total !== undefined && (
          <View className="mt-1.5">
            <ProgressBar watched={watched} total={total} />
          </View>
        )}
      </View>
    </View>
  );
}
