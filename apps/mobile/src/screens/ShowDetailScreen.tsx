import { useEffect, useState, useMemo } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShowDetails } from "../hooks/useShowDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useUpsertTracking, useToggleEpisode, useMarkUpTo, useToggleDropped } from "../hooks/useTracking";
import { useRatingsForShow, useUpsertRating } from "../hooks/useRatings";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { LazyEpisodeGrid } from "../components/LazyEpisodeGrid";
import { RatingStars } from "../components/RatingStars";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { FixedTrackingButton } from "../components/FixedTrackingButton";
import { TrackingActionModal } from "../components/TrackingActionModal";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getPosterUrl, getProfileUrl, Episode, CastMember, CrewMember, Genre, Network } from "../services/shows.service";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { WatchStatus } from "../services/tracking.service";
import { useUIStore } from "../store/uiStore";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";

type ShowDetailRouteProp = RouteProp<RootStackParamList, "ShowDetail">;
type ShowDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

function getStatusLabel(t: ReturnType<typeof useI18n>["t"], status: WatchStatus): string {
  switch (status) {
    case "watching":
      return t("screens.showDetail.inProgress");
    case "completed":
      return t("screens.showDetail.completed");
    case "plan_to_watch":
      return t("screens.showDetail.planToWatch");
    case "dropped":
      return t("screens.showDetail.dropped");
  }
}

export function ShowDetailScreen() {
  const route = useRoute<ShowDetailRouteProp>();
  const navigation = useNavigation<ShowDetailNavigationProp>();
  const { tmdbId, title } = route.params;
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const isValidTmdbId = Number.isFinite(tmdbId) && tmdbId > 0;

  const { data: show, isLoading, isError, refetch } = useShowDetails(tmdbId);
  const { data: trackingEntry, refetch: refetchTrackingEntry } = useTrackingEntry(show?.id ?? "");
  const { data: ratings, refetch: refetchRatings } = useRatingsForShow(show?.id ?? "");
  const throttledRefresh = useRefreshRateLimit();
  const upsertTracking = useUpsertTracking(show?.id ?? "");
  const toggleEpisode = useToggleEpisode(show?.id ?? "");
  const markUpTo = useMarkUpTo(show?.id ?? "");
  const upsertRating = useUpsertRating(show?.id ?? "");
  const toggleDropped = useToggleDropped(show?.id ?? "");

  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  useEffect(() => {
    log("ShowDetail", "mount", { tmdbId, title });
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    if (show) {
      log("ShowDetail", "show data", {
        tmdbId,
        hasCast: Boolean(show.cast?.length),
        castCount: show.cast?.length ?? 0,
        crewCount: show.crew?.length ?? 0,
        genresCount: show.genres?.length ?? 0,
        networksCount: show.networks?.length ?? 0,
      });
    }
  }, [show, tmdbId]);

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

  const handleRefresh = () => {
    refetch();
    if (show?.id) {
      refetchTrackingEntry();
      refetchRatings();
    }
  };

  const handleSaveTracking = (payload: {
    currentSeason?: number;
    currentEpisode?: number;
    includePrevious: boolean;
    rating?: number | null;
  }) => {
    if (!show) return;

    log("ShowDetail", "save tracking", { showId: show.id, ...payload });

    upsertTracking.mutate(
      {
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
                onError: () => showSnackbar(t("screens.showDetail.updateProgressError"), "error"),
              },
            );
          }
          if (payload.rating !== undefined && payload.rating !== null) {
            upsertRating.mutate({ value: payload.rating });
          }
          setTrackingModalVisible(false);
        },
        onError: () => showSnackbar(t("screens.showDetail.updateTrackingError"), "error"),
      },
    );
  };

  const handleToggleEpisode = (season: number, episode: number, watched: boolean) => {
    log("ShowDetail", "toggle episode", { showId: show?.id, season, episode, watched });
    toggleEpisode.mutate({ season, episode, watched });
  };

  const handleToggleDropped = () => {
    if (!show) return;
    const nextDropped = trackingEntry?.status !== "dropped";
    log("ShowDetail", "toggle dropped", { showId: show.id, dropped: nextDropped });
    toggleDropped.mutate(nextDropped, {
      onSuccess: () => showSnackbar(nextDropped ? t("screens.showDetail.droppedStatus") : t("screens.showDetail.resumedStatus"), "success"),
      onError: () => showSnackbar(t("screens.showDetail.statusError"), "error"),
    });
  };

  const handleOpenEpisodeDetail = (season: number, episode: Episode) => {
    if (!show) return;
    navigation.navigate("EpisodeDetail", {
      showId: show.id,
      tmdbId,
      season,
      episodeNumber: episode.episodeNumber,
      title: episode.name,
    });
  };

  if (!isValidTmdbId) {
    return (
      <ScreenContainer>
        <NetworkError
          message={t("errors.invalidShowId")}
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
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(handleRefresh)} tintColor={colors.primary} />}
      >
        <View className="relative">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="w-full h-80 bg-surface-light"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-80 bg-surface-light items-center justify-center">
              <Text className="text-text-muted">{t("common.noImage")}</Text>
            </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent h-24" />
        </View>

        <View className="px-4 -mt-8">
          <Text className="text-3xl font-bold text-text mb-2">{show.title}</Text>
          <Text className="text-text-muted mb-4">
            {show.firstAirDate ? new Date(show.firstAirDate).getFullYear().toString() : "—"}
            {" · "}
            {show.type === "tv" ? t("common.tv") : t("common.movie")}
          </Text>

          {show.overview && (
            <Text className="text-text leading-relaxed mb-6">{show.overview}</Text>
          )}

          <View className="mb-6">
            <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.yourRating")}</Text>
            <RatingStars
              value={ratings?.show ?? null}
              onChange={(value) => {
                log("ShowDetail", "rating change", { showId: show.id, value });
                upsertRating.mutate({ value });
              }}
            />
          </View>

          {show.genres && show.genres.length > 0 && (
            <View className="flex-row flex-wrap mb-4">
              {show.genres.map((genre: Genre) => (
                <View key={genre.id} className="bg-surface rounded-full px-3 py-1 mr-2 mb-2">
                  <Text className="text-text text-xs">{genre.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="bg-surface rounded-lg p-4 mb-6">
            <View className="flex-row flex-wrap justify-between">
              {trackingEntry && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.tracking")}</Text>
                  <Text className="text-text font-medium">{getStatusLabel(t, trackingEntry.status as WatchStatus)}</Text>
                </View>
              )}
              {show.status && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.status")}</Text>
                  <Text className="text-text font-medium">{show.status}</Text>
                </View>
              )}
              {show.type === "tv" && show.numberOfSeasons !== undefined && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.seasons")}</Text>
                  <Text className="text-text font-medium">{show.numberOfSeasons}</Text>
                </View>
              )}
              {show.type === "tv" && show.numberOfEpisodes !== undefined && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.episodes")}</Text>
                  <Text className="text-text font-medium">{show.numberOfEpisodes}</Text>
                </View>
              )}
              {show.runtime && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.duration")}</Text>
                  <Text className="text-text font-medium">{show.runtime} {t("common.minutesShort")}</Text>
                </View>
              )}
              {show.voteAverage !== undefined && show.voteCount !== undefined && show.voteCount > 0 && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.tmdbRating")}</Text>
                  <Text className="text-text font-medium">{show.voteAverage.toFixed(1)}/10</Text>
                </View>
              )}
              {show.networks && show.networks.length > 0 && (
                <View className="w-1/2 mb-3 pr-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.showDetail.network")}</Text>
                  <Text className="text-text font-medium">{show.networks.map((n: Network) => n.name).join(", ")}</Text>
                </View>
              )}
            </View>
          </View>

          {show.cast && show.cast.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.cast")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {show.cast.slice(0, 15).map((member: CastMember, index: number) => (
                  <CastMemberCard key={`${member.id}-${index}`} member={member} />
                ))}
              </ScrollView>
            </View>
          )}

          {show.crew && show.crew.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">
                {show.type === "tv" ? t("screens.showDetail.creators") : t("screens.showDetail.directors")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {show.crew.slice(0, 10).map((member: CrewMember, index: number) => (
                  <CrewMemberCard key={`${member.id}-${member.job ?? index}`} member={member} />
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate("ShowComments", { showId: show.id, title: show.title })}
            className="flex-row items-center justify-between bg-surface rounded-lg p-4 mb-6"
            activeOpacity={0.7}
          >
            <Text className="text-text font-semibold">{t("screens.showDetail.comments")}</Text>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          {trackingEntry && (
            <TouchableOpacity
              onPress={handleToggleDropped}
              className={`flex-row items-center justify-between rounded-lg p-4 mb-6 ${
                trackingEntry.status === "dropped" ? "bg-surface border border-primary" : "bg-surface"
              }`}
              activeOpacity={0.7}
              disabled={toggleDropped.isPending}
            >
              <Text className="text-text font-semibold">
                {trackingEntry.status === "dropped" ? t("screens.showDetail.resumeShow") : t("screens.showDetail.dropShow")}
              </Text>
              <Ionicons
                name={trackingEntry.status === "dropped" ? "play-outline" : "trash-outline"}
                size={20}
                color={trackingEntry.status === "dropped" ? colors.primary : colors.danger}
              />
            </TouchableOpacity>
          )}

          {show.type === "tv" && show.seasons.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.episodes")}</Text>
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
    </ScreenContainer>
  );
}

function CastMemberCard({ member }: { member: CastMember }) {
  const { t } = useI18n();
  const profileUrl = getProfileUrl(member.profilePath, 200);
  return (
    <View className="mr-3 items-center" style={{ width: 80 }}>
      {profileUrl ? (
        <Image
          source={{ uri: profileUrl }}
          className="w-20 h-20 rounded-full bg-surface-light mb-2"
          resizeMode="cover"
        />
      ) : (
        <View className="w-20 h-20 rounded-full bg-surface-light items-center justify-center mb-2">
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <Text className="text-text text-xs font-medium text-center" numberOfLines={2}>
        {member.name ?? t("common.unknown")}
      </Text>
      {member.character && (
        <Text className="text-text-muted text-xs text-center mt-0.5" numberOfLines={1}>
          {member.character}
        </Text>
      )}
    </View>
  );
}

function CrewMemberCard({ member }: { member: CrewMember }) {
  const { t } = useI18n();
  const profileUrl = getProfileUrl(member.profilePath, 200);
  return (
    <View className="mr-3 items-center" style={{ width: 80 }}>
      {profileUrl ? (
        <Image
          source={{ uri: profileUrl }}
          className="w-20 h-20 rounded-full bg-surface-light mb-2"
          resizeMode="cover"
        />
      ) : (
        <View className="w-20 h-20 rounded-full bg-surface-light items-center justify-center mb-2">
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <Text className="text-text text-xs font-medium text-center" numberOfLines={2}>
        {member.name ?? t("common.unknown")}
      </Text>
      {member.job && (
        <Text className="text-text-muted text-xs text-center mt-0.5" numberOfLines={1}>
          {member.job}
        </Text>
      )}
    </View>
  );
}
