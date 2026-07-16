import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPosterUrl } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { hapticLight, hapticMedium } from "../utils/haptics";

interface MediaRowProps {
  posterPath?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  meta?: string;
  onPress: () => void;
  onTitlePress?: () => void;
  onLongPress?: () => void;
  rightElement?: React.ReactNode;
  posterWidth?: number;
  posterHeight?: number;
}

export function MediaRow({
  posterPath,
  title,
  subtitle,
  badge,
  badgeColor,
  meta,
  onPress,
  onTitlePress,
  onLongPress,
  rightElement,
  posterWidth = 56,
  posterHeight = 80,
}: MediaRowProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const posterUrl = getPosterUrl(posterPath, 200);

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface rounded-lg p-3 mb-3 active:opacity-70"
      onPress={() => { hapticLight(); onPress(); }}
      onLongPress={onLongPress ? () => { hapticMedium(); onLongPress(); } : undefined}
      delayLongPress={400}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={{ width: posterWidth, height: posterHeight, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: posterWidth,
            height: posterHeight,
            borderRadius: 8,
            backgroundColor: colors.surfaceLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
        </View>
      )}

      <View className="flex-1 ml-3">
        {onTitlePress ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              hapticLight();
              onTitlePress();
            }}
            className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5"
            activeOpacity={0.7}
          >
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-text font-semibold text-base mb-1" numberOfLines={2}>
            {title}
          </Text>
        )}

        {subtitle && (
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            {subtitle}
          </Text>
        )}

        {meta && (
          <Text className="text-text-muted text-xs mt-0.5">{meta}</Text>
        )}

        {badge && (
          <View
            className="rounded-full px-2 py-0.5 self-start mt-1.5"
            style={{ backgroundColor: badgeColor ?? colors.primary }}
          >
            <Text className="text-background text-xs font-semibold">{badge}</Text>
          </View>
        )}
      </View>

      {rightElement && <View className="ml-2">{rightElement}</View>}
    </TouchableOpacity>
  );
}
