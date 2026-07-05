import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ShowDetails } from "../services/shows.service";
import { WatchEntry } from "../services/tracking.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface FixedTrackingButtonProps {
  show: ShowDetails;
  trackingEntry?: WatchEntry | null;
  progress?: number;
  onPress: () => void;
  disabled?: boolean;
  onToggleWatched?: () => void;
  onToggleDropped?: () => void;
}

export function FixedTrackingButton({
  show,
  trackingEntry,
  progress,
  onPress,
  disabled,
  onToggleWatched,
  onToggleDropped,
}: FixedTrackingButtonProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const hasProgress = progress !== undefined && progress > 0 && progress < 1;
  const isCompleted = progress === 1;

  // Pour les films, utiliser le bouton de toggle vu/non vu
  if (show.type === "movie" && trackingEntry && onToggleWatched) {
    const isWatched = trackingEntry.status === "completed";
    return (
      <View
        className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-border px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <TouchableOpacity
          className={`flex-row items-center justify-center py-3 rounded-lg ${
            isWatched ? "bg-surface border border-primary" : "bg-primary"
          }`}
          onPress={onToggleWatched}
          disabled={disabled}
        >
          <Ionicons
            name={isWatched ? "close-circle-outline" : "checkmark-circle-outline"}
            size={20}
            color={isWatched ? colors.primary : colors.background}
            style={{ marginRight: 8 }}
          />
          <Text
            className={`font-semibold ${isWatched ? "text-primary" : "text-background"}`}
          >
            {isWatched ? t("screens.showDetail.markUnwatched") : t("screens.showDetail.markWatched")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pour les séries TV suivies, afficher Abandonner/Reprendre
  const isTvTracked = show.type === "tv" && trackingEntry && onToggleDropped;
  const isDropped = trackingEntry?.status === "dropped";

  let label = t("screens.showDetail.addToList");
  if (isTvTracked) {
    label = isDropped
      ? t("screens.showDetail.resumeShow")
      : t("screens.showDetail.dropShow");
  } else if (trackingEntry) {
    if (isCompleted) {
      label = t("screens.showDetail.completed");
    } else {
      label = t("screens.showDetail.inProgress");
    }
  }

  const buttonClassName = isTvTracked
    ? isDropped
      ? "bg-surface border border-primary"
      : "bg-danger"
    : trackingEntry
      ? "bg-surface border border-primary"
      : "bg-primary";

  const iconName = isTvTracked
    ? isDropped
      ? "play"
      : "trash-outline"
    : trackingEntry
      ? "play"
      : "add";

  const iconColor = isTvTracked
    ? isDropped
      ? colors.primary
      : colors.background
    : trackingEntry
      ? colors.primary
      : colors.background;

  const textColor = isTvTracked
    ? isDropped
      ? "text-primary"
      : "text-background"
    : trackingEntry
      ? "text-primary"
      : "text-background";

  const handlePress = isTvTracked ? onToggleDropped! : onPress;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-border px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <TouchableOpacity
        className={`flex-row items-center justify-center py-3 rounded-lg ${buttonClassName}`}
        onPress={handlePress}
        disabled={disabled}
      >
        <Ionicons
          name={iconName}
          size={20}
          color={iconColor}
          style={{ marginRight: 8 }}
        />
        <Text
          className={`font-semibold ${textColor}`}
        >
          {label}
        </Text>
      </TouchableOpacity>
      {hasProgress && (
        <View className="mt-2 h-1 bg-surface-light rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
      )}
    </View>
  );
}
