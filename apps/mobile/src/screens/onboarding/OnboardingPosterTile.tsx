import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "../../components/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { SearchResultItem, getPosterUrl } from "../../services/shows.service";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";

interface OnboardingPosterTileProps {
  show: SearchResultItem;
  selected: boolean;
  onToggle: () => void;
}

const TILE_SIZE = 100;

export function OnboardingPosterTile({ show, selected, onToggle }: OnboardingPosterTileProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(show.posterPath, 200);

  return (
    <TouchableOpacity
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE * 1.5,
        borderRadius: 8,
        backgroundColor: colors.surfaceLight,
        overflow: "hidden",
        marginBottom: 8,
      }}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={{ width: TILE_SIZE, height: TILE_SIZE * 1.5 }}
        />
      ) : (
        <View
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE * 1.5,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-text-muted text-xs text-center px-2">{t("common.noImage")}</Text>
        </View>
      )}

      {selected && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark" size={20} color={colors.background} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
