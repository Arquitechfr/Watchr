import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ShowDetails } from "../services/shows.service";
import { WatchEntry } from "../services/tracking.service";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";

interface FixedTrackingButtonProps {
  show: ShowDetails;
  trackingEntry?: WatchEntry | null;
  progress?: number;
  onPress: () => void;
  disabled?: boolean;
}

export function FixedTrackingButton({
  show,
  trackingEntry,
  progress,
  onPress,
  disabled,
}: FixedTrackingButtonProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const hasProgress = progress !== undefined && progress > 0 && progress < 1;
  const isCompleted = progress === 1;

  let label = t("screens.showDetail.addToList");
  if (trackingEntry) {
    if (isCompleted) {
      label = t("screens.showDetail.completed");
    } else if (show.type === "tv" && trackingEntry.currentSeason && trackingEntry.currentEpisode) {
      label = t("screens.showDetail.continueSeason", {
        season: trackingEntry.currentSeason,
        episode: trackingEntry.currentEpisode,
      });
    } else {
      label = t("screens.showDetail.inProgress");
    }
  }

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-border px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <TouchableOpacity
        className={`flex-row items-center justify-center py-3 rounded-lg ${
          trackingEntry ? "bg-surface border border-primary" : "bg-primary"
        }`}
        onPress={onPress}
        disabled={disabled}
      >
        <Ionicons
          name={trackingEntry ? "play" : "add"}
          size={20}
          color={trackingEntry ? colors.primary : colors.background}
          style={{ marginRight: 8 }}
        />
        <Text
          className={`font-semibold ${trackingEntry ? "text-primary" : "text-background"}`}
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
