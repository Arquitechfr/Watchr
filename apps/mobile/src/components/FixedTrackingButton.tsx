import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ShowDetails } from "../services/shows.service";
import { WatchEntry } from "../services/tracking.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { hapticMedium } from "../utils/haptics";

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
        className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <TouchableOpacity
          className="flex-row items-center justify-center py-3 rounded-lg bg-primary"
          onPress={() => { hapticMedium(); onToggleWatched(); }}
          disabled={disabled}
        >
          <Ionicons
            name={isWatched ? "close-circle-outline" : "checkmark-circle-outline"}
            size={20}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <Text
            className="font-semibold text-white"
          >
            {isWatched ? t("screens.showDetail.markUnwatched") : t("screens.showDetail.markWatched")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pour les séries TV suivies, afficher Arrêter/Reprendre
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

  const buttonClassName = isTvTracked && !isDropped ? "bg-danger" : "bg-primary";

  const iconName = isTvTracked
    ? isDropped
      ? "play"
      : "trash-outline"
    : trackingEntry
      ? "play"
      : "add";

  const iconColor = "#ffffff";

  const textColor = "text-white";

  const handlePress = isTvTracked ? onToggleDropped! : onPress;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <TouchableOpacity
        className={`flex-row items-center justify-center py-3 rounded-lg ${buttonClassName}`}
        onPress={() => { hapticMedium(); handlePress(); }}
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
