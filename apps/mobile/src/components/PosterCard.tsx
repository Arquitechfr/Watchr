import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SearchResultItem, getPosterUrl } from "../services/shows.service";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";

interface PosterCardProps {
  show: SearchResultItem;
  onPress: () => void;
  onAdd?: () => void;
  isAdding?: boolean;
  isAdded?: boolean;
}

const CARD_WIDTH = 128;
const CARD_HEIGHT = 192;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  posterContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  },
  posterImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  placeholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});

export function PosterCard({ show, onPress, onAdd, isAdding, isAdded }: PosterCardProps) {
  const { t } = useI18n();
  const posterUrl = getPosterUrl(show.posterPath, 200);
  const year = show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.posterContainer} onPress={onPress} activeOpacity={0.7}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.posterImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
          </View>
        )}
      </TouchableOpacity>

      {onAdd && !isAdded && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd} disabled={isAdding} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

      {isAdded && (
        <View style={styles.addButton}>
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
      </View>
    </View>
  );
}
