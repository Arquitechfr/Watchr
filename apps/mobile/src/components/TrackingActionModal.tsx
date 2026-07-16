import { useState, useMemo } from "react";
import { Modal, View, Text, ScrollView, TouchableOpacity, Switch, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ShowDetails } from "../services/shows.service";
import { WatchEntry } from "../services/tracking.service";
import { RatingStars } from "./RatingStars";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface TrackingActionModalProps {
  visible: boolean;
  onClose: () => void;
  show: ShowDetails;
  trackingEntry?: WatchEntry | null;
  rating?: number | null;
  onSave: (payload: {
    currentSeason?: number;
    currentEpisode?: number;
    includePrevious: boolean;
    rating?: number | null;
  }) => void;
  isPending: boolean;
}

export function TrackingActionModal({
  visible,
  onClose,
  show,
  trackingEntry,
  rating,
  onSave,
  isPending,
}: TrackingActionModalProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const isTv = show.type === "tv";
  const initialSeason = trackingEntry?.currentSeason ?? (show.seasons[0]?.seasonNumber ?? 1);
  const initialEpisode = trackingEntry?.currentEpisode ?? 1;

  const [selectedSeason, setSelectedSeason] = useState<number>(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(initialEpisode);
  const [includePrevious, setIncludePrevious] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number | null>(rating ?? null);

  const currentSeason = useMemo(
    () => show.seasons.find((s) => s.seasonNumber === selectedSeason) ?? show.seasons[0],
    [show.seasons, selectedSeason],
  );

  const maxEpisode = currentSeason?.episodeCount ?? 1;

  const selectedEpisodeData = useMemo(
    () => currentSeason?.episodes?.find((e) => e.episodeNumber === selectedEpisode),
    [currentSeason, selectedEpisode],
  );

  const previousUnwatchedCount = useMemo(() => {
    if (!isTv) return 0;
    const watchedKeys = new Set(
      (trackingEntry?.watchedEpisodes ?? []).map((we) => `${we.season}-${we.episode}`),
    );
    return show.seasons
      .flatMap((s) => {
        const count = s.episodeCount ?? s.episodes?.length ?? 0;
        const numbers = Array.from({ length: count }, (_, i) => i + 1);
        return numbers
          .filter((ep) => {
            if (s.seasonNumber < selectedSeason) return true;
            if (s.seasonNumber > selectedSeason) return false;
            return ep < selectedEpisode;
          })
          .map((ep) => ({ season: s.seasonNumber, episode: ep }));
      })
      .filter((ep) => !watchedKeys.has(`${ep.season}-${ep.episode}`)).length;
  }, [show.seasons, selectedSeason, selectedEpisode, trackingEntry?.watchedEpisodes, isTv]);

  const handleSave = () => {
    const payload: Parameters<typeof onSave>[0] = {
      includePrevious,
      rating: selectedRating,
    };
    if (isTv) {
      payload.currentSeason = selectedSeason;
      payload.currentEpisode = selectedEpisode;
    }
    onSave(payload);
  };

  const handleSeasonChange = (nextSeasonNumber: number) => {
    setSelectedSeason(nextSeasonNumber);
    const nextSeason = show.seasons.find((s) => s.seasonNumber === nextSeasonNumber);
    const nextMaxEpisode = nextSeason?.episodeCount ?? 1;
    if (selectedEpisode > nextMaxEpisode) {
      setSelectedEpisode(nextMaxEpisode);
    } else if (selectedEpisode < 1) {
      setSelectedEpisode(1);
    }
  };

  const handleEpisodeChange = (delta: number) => {
    const next = selectedEpisode + delta;
    if (next < 1) {
      setSelectedEpisode(maxEpisode);
    } else if (next > maxEpisode) {
      setSelectedEpisode(1);
    } else {
      setSelectedEpisode(next);
    }
  };

  return (
    <Modal visible={visible} animationType={isDesktopWeb ? "fade" : "slide"} transparent onRequestClose={onClose}>
      <View className={isDesktopWeb ? "flex-1 justify-center items-center bg-black/70 px-6" : "flex-1 justify-end bg-black/70"}>
        <View
          className={
            isDesktopWeb
              ? "bg-background rounded-2xl w-full max-w-md max-h-[85%] overflow-hidden"
              : "bg-background rounded-t-3xl max-h-[85%] flex-1 overflow-hidden"
          }
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <TouchableOpacity
              onPress={onClose}
              disabled={isPending}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-9 h-9 items-center justify-center rounded-full bg-surface"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
              <Text className="text-text font-bold text-base">
                {trackingEntry ? t("common.edit") : t("screens.showDetail.addToList")}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isPending}
              className={`px-4 py-2 rounded-full ${isPending ? "bg-surface" : "bg-primary"}`}
            >
              <Text className={`font-semibold text-sm ${isPending ? "text-text-muted" : "text-white"}`}>
                {t("common.save")}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5 pt-5 flex-1" showsVerticalScrollIndicator={false}>
            {isTv && (
              <View className="rounded-2xl bg-surface p-4 mb-4">
                <View className="flex-row items-center gap-2 mb-4">
                  <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
                  <Text className="text-text font-bold text-base">
                    {t("screens.showDetail.inProgress")}
                  </Text>
                </View>

                {/* Season & Episode steppers */}
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-text-muted text-xs font-medium mb-2 uppercase tracking-wide">
                      {t("screens.showDetail.season")}
                    </Text>
                    <View className="flex-row items-center bg-background rounded-xl border border-border px-2 py-2.5">
                      <TouchableOpacity
                        className="w-8 h-8 items-center justify-center rounded-lg active:bg-surfaceLight"
                        onPress={() => {
                          const seasonNumbers = show.seasons.map((s) => s.seasonNumber);
                          const previous = seasonNumbers
                            .filter((n) => n < selectedSeason)
                            .pop();
                          if (previous !== undefined) {
                            handleSeasonChange(previous);
                          } else {
                            const last = seasonNumbers[seasonNumbers.length - 1];
                            if (last !== undefined) handleSeasonChange(last);
                          }
                        }}
                        disabled={isPending}
                      >
                        <Ionicons name="chevron-back" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <Text className="flex-1 text-center text-text font-bold text-sm">
                        {selectedSeason}
                      </Text>
                      <TouchableOpacity
                        className="w-8 h-8 items-center justify-center rounded-lg active:bg-surfaceLight"
                        onPress={() => {
                          const seasonNumbers = show.seasons.map((s) => s.seasonNumber);
                          const next = seasonNumbers.find((n) => n > selectedSeason);
                          if (next !== undefined) {
                            handleSeasonChange(next);
                          } else {
                            const first = seasonNumbers[0];
                            if (first !== undefined) handleSeasonChange(first);
                          }
                        }}
                        disabled={isPending}
                      >
                        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-text-muted text-xs font-medium mb-2 uppercase tracking-wide">
                      {t("screens.showDetail.episode")}
                    </Text>
                    <View className="flex-row items-center bg-background rounded-xl border border-border px-2 py-2.5">
                      <TouchableOpacity
                        className="w-8 h-8 items-center justify-center rounded-lg active:bg-surfaceLight"
                        onPress={() => handleEpisodeChange(-1)}
                        disabled={isPending}
                      >
                        <Ionicons name="chevron-back" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <Text className="flex-1 text-center text-text font-bold text-sm">
                        {selectedEpisode}
                      </Text>
                      <TouchableOpacity
                        className="w-8 h-8 items-center justify-center rounded-lg active:bg-surfaceLight"
                        onPress={() => handleEpisodeChange(1)}
                        disabled={isPending}
                      >
                        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Episode name */}
                {selectedEpisodeData?.name ? (
                  <Text className="text-text-muted text-xs text-center mb-3" numberOfLines={1}>
                    {selectedEpisodeData.name}
                  </Text>
                ) : null}

                {/* Include previous toggle */}
                <View className="flex-row items-center justify-between bg-background rounded-xl border border-border px-3 py-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-text text-sm">
                      {t("screens.episode.markPreviousMessage", { count: previousUnwatchedCount })}
                    </Text>
                  </View>
                  <Switch
                    value={includePrevious}
                    onValueChange={setIncludePrevious}
                    trackColor={{ false: colors.border, true: colors.primaryDark }}
                    thumbColor={includePrevious ? colors.primary : colors.textMuted}
                    disabled={isPending}
                  />
                </View>
              </View>
            )}

            {/* Rating section */}
            <View className="rounded-2xl bg-surface p-4 mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="star-outline" size={18} color={colors.primary} />
                <Text className="text-text font-bold text-base">
                  {t("screens.showDetail.yourRating")}
                </Text>
              </View>
              <View className="items-center py-1">
                <RatingStars value={selectedRating} onChange={setSelectedRating} size={32} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
