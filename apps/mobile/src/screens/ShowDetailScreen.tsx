import { useEffect, useState, useMemo } from "react";
import { View, Text, Image, ScrollView, Alert, TouchableOpacity } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShowDetails } from "../hooks/useShowDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useUpsertTracking, useToggleEpisode, useMarkUpTo } from "../hooks/useTracking";
import { useRatingsForShow, useUpsertRating } from "../hooks/useRatings";
import { LazyEpisodeGrid } from "../components/LazyEpisodeGrid";
import { RatingStars } from "../components/RatingStars";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { FixedTrackingButton } from "../components/FixedTrackingButton";
import { TrackingActionModal } from "../components/TrackingActionModal";
import { EpisodeDetailModal } from "../components/EpisodeDetailModal";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getPosterUrl, Episode } from "../services/shows.service";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { WatchStatus } from "../services/tracking.service";
import { useUIStore } from "../store/uiStore";
import { log } from "../utils/logger";

type ShowDetailRouteProp = RouteProp<RootStackParamList, "ShowDetail">;
type ShowDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

export function ShowDetailScreen() {
  const route = useRoute<ShowDetailRouteProp>();
  const navigation = useNavigation<ShowDetailNavigationProp>();
  const { tmdbId, title } = route.params;
  const { showSnackbar } = useUIStore();
  const isValidTmdbId = Number.isFinite(tmdbId) && tmdbId > 0;

  const { data: show, isLoading, isError, refetch } = useShowDetails(tmdbId);
  const { data: trackingEntry } = useTrackingEntry(show?.id ?? "");
  const { data: ratings } = useRatingsForShow(show?.id ?? "");
  const upsertTracking = useUpsertTracking(show?.id ?? "");
  const toggleEpisode = useToggleEpisode(show?.id ?? "");
  const markUpTo = useMarkUpTo(show?.id ?? "");
  const upsertRating = useUpsertRating(show?.id ?? "");

  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    visible: boolean;
    season: number;
    episode: Episode;
  }>({ visible: false, season: 1, episode: { episodeNumber: 1 } });

  useEffect(() => {
    log("ShowDetail", "mount", { tmdbId, title });
    navigation.setOptions({ title });
  }, [navigation, title]);

  const progress = useMemo(() => {
    if (!show || show.type !== "tv") {
      if (trackingEntry?.status === "completed") return 1;
      return 0;
    }
    const totalEpisodes = show.seasons.reduce(
      (sum: number, season: { episodeCount: number }) => sum + (season.episodeCount ?? 0),
      0,
    );
    if (totalEpisodes === 0) return 0;
    const watchedCount = trackingEntry?.watchedEpisodes.length ?? 0;
    return Math.min(1, watchedCount / totalEpisodes);
  }, [show, trackingEntry]);

  const isAnyPending =
    upsertTracking.isPending || markUpTo.isPending || toggleEpisode.isPending || upsertRating.isPending;

  const handleSaveTracking = (payload: {
    status: WatchStatus;
    currentSeason?: number;
    currentEpisode?: number;
    includePrevious: boolean;
    rating?: number | null;
  }) => {
    if (!show) return;

    log("ShowDetail", "save tracking", { showId: show.id, ...payload });

    upsertTracking.mutate(
      {
        status: payload.status,
        currentSeason: payload.currentSeason,
        currentEpisode: payload.currentEpisode,
      },
      {
        onSuccess: () => {
          if (show.type === "tv" && payload.currentSeason && payload.currentEpisode) {
            markUpTo.mutate(
              {
                season: payload.currentSeason,
                episode: payload.currentEpisode,
                includePrevious: payload.includePrevious,
              },
              {
                onError: () => showSnackbar("Impossible de mettre à jour la progression", "error"),
              },
            );
          }
          if (payload.rating !== undefined && payload.rating !== null) {
            upsertRating.mutate({ value: payload.rating });
          }
          setTrackingModalVisible(false);
        },
        onError: () => showSnackbar("Impossible de mettre à jour le suivi", "error"),
      },
    );
  };

  const handleToggleEpisode = (season: number, episode: number, watched: boolean) => {
    log("ShowDetail", "toggle episode", { showId: show?.id, season, episode, watched });
    toggleEpisode.mutate({ season, episode, watched });
  };

  const handleToggleWatchedFromDetail = () => {
    if (!show || show.type !== "tv") return;
    const { season, episode } = detailModal;
    const nextIsWatched = !detailIsWatched;
    if (!nextIsWatched) {
      handleToggleEpisode(season, episode.episodeNumber, false);
      return;
    }

    const previousUnwatched = show.seasons.flatMap((s: { seasonNumber: number; episodeCount: number }) => {
      const count = s.episodeCount ?? 0;
      const episodeNumbers = Array.from({ length: count }, (_, i) => i + 1);
      return episodeNumbers
        .filter((episodeNumber) => {
          if (s.seasonNumber < season) return true;
          if (s.seasonNumber > season) return false;
          return episodeNumber < episode.episodeNumber;
        })
        .map((episodeNumber) => ({ season: s.seasonNumber, episode: episodeNumber }));
    }).filter((ep: { season: number; episode: number }) => !watchedKeys.has(`${ep.season}-${ep.episode}`));

    if (previousUnwatched.length === 0) {
      handleToggleEpisode(season, episode.episodeNumber, true);
      return;
    }

    Alert.alert(
      "Marquer les épisodes précédents ?",
      `${previousUnwatched.length} épisode${previousUnwatched.length > 1 ? "s" : ""} précédent${previousUnwatched.length > 1 ? "s" : ""} non vu${previousUnwatched.length > 1 ? "s" : ""}. Les marquer comme vus ?`,
      [
        { text: "Non", style: "cancel", onPress: () => handleToggleEpisode(season, episode.episodeNumber, true) },
        {
          text: "Oui",
          onPress: () => {
            log("ShowDetail", "mark up to from detail", { showId: show.id, season, episode: episode.episodeNumber });
            markUpTo.mutate(
              { season, episode: episode.episodeNumber, includePrevious: true },
              { onError: () => showSnackbar("Impossible de marquer les épisodes", "error") },
            );
          },
        },
      ],
    );
  };

  const handleOpenEpisodeDetail = (season: number, episode: Episode) => {
    setDetailModal({ visible: true, season, episode });
  };

  const handleCloseEpisodeDetail = () => {
    setDetailModal((prev) => ({ ...prev, visible: false }));
  };

  const watchedKeys = useMemo(
    () =>
      new Set(
        (trackingEntry?.watchedEpisodes ?? []).map((ep: { season: number; episode: number }) => `${ep.season}-${ep.episode}`),
      ),
    [trackingEntry?.watchedEpisodes],
  );

  const detailIsWatched =
    detailModal.episode && watchedKeys.has(`${detailModal.season}-${detailModal.episode.episodeNumber}`);

  if (!isValidTmdbId) {
    return (
      <ScreenContainer>
        <NetworkError
          message="Identifiant de show invalide"
          onRetry={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer className="px-4 pt-4">
        <Skeleton width="100%" height={240} borderRadius={12} className="mb-4" />
        <Skeleton width="70%" height={24} className="mb-2" />
        <Skeleton width="40%" height={16} className="mb-6" />
        <Skeleton width="100%" height={80} className="mb-6" />
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} width="100%" height={60} className="mb-2" />
        ))}
      </ScreenContainer>
    );
  }

  if (isError || !show) {
    return (
      <ScreenContainer>
        <NetworkError onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  const posterUrl = getPosterUrl(show.posterPath, 500);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="relative">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="w-full h-80 bg-surface-light"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-80 bg-surface-light items-center justify-center">
              <Text className="text-text-muted">No image</Text>
            </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent h-24" />
        </View>

        <View className="px-4 -mt-8">
          <Text className="text-3xl font-bold text-text mb-2">{show.title}</Text>
          <Text className="text-text-muted mb-4">
            {show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : "—"}
            {" · "}
            {show.type === "tv" ? "Série" : "Film"}
          </Text>

          {show.overview && (
            <Text className="text-text leading-relaxed mb-6">{show.overview}</Text>
          )}

          <View className="mb-6">
            <Text className="text-lg font-semibold text-text mb-2">Ta note</Text>
            <RatingStars
              value={ratings?.show ?? null}
              onChange={(value) => {
                log("ShowDetail", "rating change", { showId: show.id, value });
                upsertRating.mutate({ value });
              }}
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("ShowComments", { showId: show.id, title: show.title })}
            className="flex-row items-center justify-between bg-surface rounded-lg p-4 mb-6"
            activeOpacity={0.7}
          >
            <Text className="text-text font-semibold">Commentaires</Text>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          {show.type === "tv" && show.seasons.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">Épisodes</Text>
              <LazyEpisodeGrid
                tmdbId={tmdbId}
                seasons={show.seasons}
                watchedEpisodes={trackingEntry?.watchedEpisodes ?? []}
                onToggleEpisode={handleToggleEpisode}
                onPressEpisode={handleOpenEpisodeDetail}
                isPending={toggleEpisode.isPending}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <FixedTrackingButton
        show={show}
        trackingEntry={trackingEntry}
        progress={progress}
        onPress={() => setTrackingModalVisible(true)}
        disabled={isAnyPending}
      />

      <TrackingActionModal
        visible={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
        show={show}
        trackingEntry={trackingEntry}
        rating={ratings?.show ?? null}
        onSave={handleSaveTracking}
        isPending={upsertTracking.isPending || markUpTo.isPending}
      />

      <EpisodeDetailModal
        visible={detailModal.visible}
        onClose={handleCloseEpisodeDetail}
        showId={show?.id}
        season={detailModal.season}
        episode={detailModal.episode}
        isWatched={detailIsWatched}
        onToggleWatched={handleToggleWatchedFromDetail}
        isPending={toggleEpisode.isPending || markUpTo.isPending}
      />
    </ScreenContainer>
  );
}
