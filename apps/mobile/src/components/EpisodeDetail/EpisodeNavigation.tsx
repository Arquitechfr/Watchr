import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";

interface EpisodeNavigationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onShowDetail: () => void;
  bottomInset: number;
}

export function EpisodeNavigation({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onShowDetail,
  bottomInset,
}: EpisodeNavigationProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 px-4 pt-3 bg-background border-t border-border flex-row items-center justify-between"
      style={{ paddingBottom: Math.max(bottomInset, 12) }}
    >
      <TouchableOpacity
        onPress={onPrevious}
        disabled={!hasPrevious}
        className={`flex-row items-center px-4 py-2 rounded-lg ${hasPrevious ? "bg-surface" : "opacity-30"}`}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text className="text-text ml-1 text-sm">{t("common.previous")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onShowDetail}
        className="items-center justify-center p-2 rounded-lg bg-surface"
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="tv-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onNext}
        disabled={!hasNext}
        className={`flex-row items-center px-4 py-2 rounded-lg ${hasNext ? "bg-surface" : "opacity-30"}`}
        activeOpacity={0.7}
      >
        <Text className="text-text mr-1 text-sm">{t("common.next")}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
