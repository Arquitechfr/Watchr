import { useState, useMemo } from "react";
import { Modal, View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ShowDetails } from "../services/shows.service";
import { WatchEntry } from "../services/tracking.service";
import { RatingStars } from "./RatingStars";
import { colors } from "../theme/colors";
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
    if (next < 1 || next > maxEpisode) return;
    setSelectedEpisode(next);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-background rounded-t-2xl max-h-[85%]">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <TouchableOpacity onPress={onClose} disabled={isPending}>
              <Text className="text-text-muted">{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text className="text-text font-semibold">
              {trackingEntry ? t("common.edit") : t("screens.showDetail.addToList")}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isPending}>
              <Text className={`font-semibold ${isPending ? "text-text-muted" : "text-primary"}`}>
                {t("common.save")}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="p-4">
            {isTv && (
              <>
                <Text className="text-lg font-semibold text-text mb-3">
                  {t("screens.showDetail.inProgress")}
                </Text>
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="text-text-muted text-sm mb-2">{t("screens.showDetail.season")}</Text>
                    <View className="flex-row items-center bg-surface rounded-lg px-3 py-2">
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => {
                          const previous = show.seasons
                            .map((s) => s.seasonNumber)
                            .filter((n) => n < selectedSeason)
                            .pop();
                          if (previous !== undefined) handleSeasonChange(previous);
                        }}
                        disabled={isPending}
                      >
                        <Ionicons name="chevron-back" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <Text className="flex-1 text-center text-text font-semibold">
                        {t("screens.showDetail.season")} {selectedSeason}
                      </Text>
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => {
                          const next = show.seasons
                            .map((s) => s.seasonNumber)
                            .find((n) => n > selectedSeason);
                          if (next !== undefined) handleSeasonChange(next);
                        }}
                        disabled={isPending}
                      >
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-text-muted text-sm mb-2">{t("screens.showDetail.episode")}</Text>
                    <View className="flex-row items-center bg-surface rounded-lg px-3 py-2">
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => handleEpisodeChange(-1)}
                        disabled={isPending || selectedEpisode <= 1}
                      >
                        <Ionicons name="chevron-back" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <Text className="flex-1 text-center text-text font-semibold">
                        {t("screens.showDetail.episode")} {selectedEpisode}
                        {selectedEpisodeData?.name ? ` · ${selectedEpisodeData.name}` : ""}
                      </Text>
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => handleEpisodeChange(1)}
                        disabled={isPending || selectedEpisode >= maxEpisode}
                      >
                        <Ionicons name="chevron-forward" size={20} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center justify-between bg-surface rounded-lg px-3 py-3 mb-6">
                  <Text className="text-text flex-1">
                    {t("screens.episode.markPreviousMessage")}
                  </Text>
                  <Switch
                    value={includePrevious}
                    onValueChange={setIncludePrevious}
                    trackColor={{ false: colors.border, true: colors.primaryDark }}
                    thumbColor={includePrevious ? colors.primary : colors.textMuted}
                    disabled={isPending}
                  />
                </View>
              </>
            )}

            <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.yourRating")}</Text>
            <View className="mb-6">
              <RatingStars value={selectedRating} onChange={setSelectedRating} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
