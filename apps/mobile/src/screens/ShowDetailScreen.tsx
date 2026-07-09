import { useEffect, useState, useMemo } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, RefreshControl, Platform, useWindowDimensions } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShowDetails } from "../hooks/useShowDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useUpsertTracking, useUpsertWithProgress, useToggleEpisode, useMarkUpTo, useMarkAllAired, useDeleteTracking } from "../hooks/useTracking";
import { useRatingsForShow, useUpsertRating } from "../hooks/useRatings";
import { useCommentCount } from "../hooks/useComments";
import { useShowDetailsRealtime } from "../hooks/useShowDetailsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { LazyEpisodeGrid } from "../components/LazyEpisodeGrid";
import { RatingCard } from "../components/RatingCard";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { DetailHeader } from "../components/DetailHeader";
import { FixedTrackingButton } from "../components/FixedTrackingButton";
import { TrackingActionModal } from "../components/TrackingActionModal";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getPosterUrl, getProfileUrl, Episode, CastMember, CrewMember, Genre, Network } from "../services/shows.service";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
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

function getTmdbStatusLabel(t: ReturnType<typeof useI18n>["t"], status: string): string {
  const key = status.replace(/\s+/g, "").replace(/-/g, "");
  const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
  const translation = t(`tmdbStatus.${lowerKey}`);
  return translation !== `tmdbStatus.${lowerKey}` ? translation : status;
}

export function ShowDetailScreen() {
  const route = useRoute<ShowDetailRouteProp>();
  const navigation = useNavigation<ShowDetailNavigationProp>();
  const { tmdbId, title } = route.params;
  const { showSnackbar, showAlert } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const isValidTmdbId = Number.isFinite(tmdbId) && tmdbId > 0;

  const { data: show, isLoading, isRefetching, isError, refetch } = useShowDetails(tmdbId);
  const { data: trackingEntry, refetch: refetchTrackingEntry } = useTrackingEntry(show?.id ?? "");
  const { data: ratings, refetch: refetchRatings } = useRatingsForShow(show?.id ?? "");
  const throttledRefresh = useRefreshRateLimit();
  const upsertTracking = useUpsertTracking(show?.id ?? "", tmdbId);
  const upsertWithProgress = useUpsertWithProgress(show?.id ?? "", tmdbId);
  const toggleEpisode = useToggleEpisode(show?.id ?? "", tmdbId);
  const markUpTo = useMarkUpTo(show?.id ?? "", tmdbId);
  const markAllAired = useMarkAllAired(show?.id ?? "", tmdbId);
  const upsertRating = useUpsertRating(show?.id ?? "");
  const deleteTracking = useDeleteTracking(show?.id ?? "", tmdbId);
  const { data: commentCountData } = useCommentCount(show?.id ?? "");

  useShowDetailsRealtime(show?.id ?? null, tmdbId);

  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  useEffect(() => {
    log("ShowDetail", "mount", { tmdbId, title });
  }, [tmdbId, title]);

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
  }, [show?.cast, show?.crew, show?.genres, show?.networks, tmdbId]);

  const progress = useMemo(() => {
    if (!show || show.type !== "tv") {
      if (trackingEntry?.status === "completed") return 1;
      return 0;
    }
    if (trackingEntry?.totalEpisodes) {
      return Math.min(1, (trackingEntry.watchedCount ?? 0) / trackingEntry.totalEpisodes);
    }
    return 0;
  }, [show, trackingEntry]);

  const allAiredWatched = useMemo(() => {
    const total = trackingEntry?.totalEpisodes ?? 0;
    const watched = trackingEntry?.watchedCount ?? 0;
    return total > 0 && watched >= total;
  }, [trackingEntry]);

  const isAnyPending =
    upsertTracking.isPending || upsertWithProgress.isPending || markUpTo.isPending || markAllAired.isPending || toggleEpisode.isPending || upsertRating.isPending;

  const handleRefresh = () => {
    refetch();
    if (show?.id) {
      refetchTrackingEntry();
      refetchRatings();
    }
  };

  const navigateToComments = () => {
    if (!show) return;
    navigation.navigate("ShowComments", { showId: show.id, title: show.title });
  };

  const handleOpenComments = () => {
    if (!show) return;
    const hasWatched =
      show.type === "movie"
        ? trackingEntry?.status === "completed"
        : (trackingEntry?.watchedCount ?? 0) > 0;
    if (hasWatched) {
      navigateToComments();
      return;
    }
    showAlert({
      title: t("screens.comments.spoilerWarningTitle"),
      message: t("screens.comments.spoilerWarningMessage", { title: show.title }),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("screens.comments.proceedAnyway"),
          onPress: navigateToComments,
        },
        {
          text: t("screens.comments.markWatchedAndProceed"),
          onPress: () => {
            if (show.type === "movie") {
              upsertTracking.mutate(
                { status: "completed" },
                {
                  onSuccess: () => navigateToComments(),
                  onError: () => showSnackbar(t("screens.showDetail.updateTrackingError"), "error"),
                },
              );
            } else {
              navigateToComments();
            }
          },
        },
      ],
    });
  };

  const handleSaveTracking = (payload: {
    currentSeason?: number;
    currentEpisode?: number;
    includePrevious: boolean;
    rating?: number | null;
  }) => {
    if (!show) return;

    log("ShowDetail", "save tracking", { showId: show.id, ...payload });

    if (show.type === "tv" && payload.currentSeason && payload.currentEpisode) {
      upsertWithProgress.mutate(
        {
          currentSeason: payload.currentSeason,
          currentEpisode: payload.currentEpisode,
          markUpTo: {
            season: payload.currentSeason,
            episode: payload.currentEpisode,
            includePrevious: payload.includePrevious,
          },
        },
        {
          onSuccess: () => {
            if (payload.rating !== undefined && payload.rating !== null) {
              upsertRating.mutate({ value: payload.rating });
            }
            setTrackingModalVisible(false);
          },
          onError: () => showSnackbar(t("screens.showDetail.updateTrackingError"), "error"),
        },
      );
    } else {
      upsertTracking.mutate(
        {
          currentSeason: payload.currentSeason,
          currentEpisode: payload.currentEpisode,
        },
        {
          onSuccess: () => {
            if (payload.rating !== undefined && payload.rating !== null) {
              upsertRating.mutate({ value: payload.rating });
            }
            setTrackingModalVisible(false);
          },
          onError: () => showSnackbar(t("screens.showDetail.updateTrackingError"), "error"),
        },
      );
    }
  };

  const handleToggleEpisode = (season: number, episode: number, watched: boolean) => {
    log("ShowDetail", "toggle episode", { showId: show?.id, season, episode, watched });
    toggleEpisode.mutate({ season, episode, watched });
  };

  const handleMarkAllAired = () => {
    if (!show) return;
    if (allAiredWatched) {
      showSnackbar(t("screens.showDetail.markAllAiredAlreadyUpToDate"), "info");
      return;
    }
    showAlert({
      title: t("screens.showDetail.markAllAiredConfirmTitle"),
      message: t("screens.showDetail.markAllAiredConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: () => {
            log("ShowDetail", "mark all aired", { showId: show.id });
            markAllAired.mutate(
              {},
              {
                onSuccess: () => showSnackbar(t("screens.showDetail.markAllAiredSuccess"), "success"),
                onError: () => showSnackbar(t("screens.showDetail.markAllAiredError"), "error"),
              },
            );
          },
        },
      ],
    });
  };

  const handleMarkSeasonAired = (seasonNumber: number) => {
    if (!show) return;
    showAlert({
      title: t("screens.showDetail.markSeasonAiredConfirmTitle", { season: seasonNumber }),
      message: t("screens.showDetail.markSeasonAiredConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: () => {
            log("ShowDetail", "mark season aired", { showId: show.id, season: seasonNumber });
            markAllAired.mutate(
              { season: seasonNumber },
              {
                onSuccess: () => showSnackbar(t("screens.showDetail.markAllAiredSuccess"), "success"),
                onError: () => showSnackbar(t("screens.showDetail.markAllAiredError"), "error"),
              },
            );
          },
        },
      ],
    });
  };

  const handleToggleDropped = () => {
    if (!show) return;

    showAlert({
      title: t("screens.showDetail.dropConfirmTitle"),
      message: t("screens.showDetail.dropConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: () => {
            log("ShowDetail", "delete tracking (drop)", { showId: show.id });
            deleteTracking.mutate(undefined, {
              onSuccess: () => showSnackbar(t("screens.showDetail.droppedStatus"), "success"),
              onError: () => showSnackbar(t("screens.showDetail.statusError"), "error"),
            });
          },
        },
      ],
    });
  };

  const handleToggleWatched = () => {
    if (!show) return;
    const isWatched = trackingEntry?.status === "completed";
    const nextStatus = isWatched ? "plan_to_watch" : "completed";
    log("ShowDetail", "toggle watched", { showId: show.id, nextStatus });
    upsertTracking.mutate(
      { status: nextStatus },
      {
        onSuccess: () => {
          showSnackbar(isWatched ? t("screens.showDetail.markUnwatched") : t("screens.showDetail.markWatched"), "success");
        },
        onError: () => showSnackbar(t("screens.showDetail.statusError"), "error"),
      },
    );
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
      <ScreenContainer edges={["top", "left", "right"]}>
        <DetailHeader title={title} onBack={() => navigation.goBack()} />
        <NetworkError
          message={t("errors.invalidShowId")}
          onRetry={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <DetailHeader title={title} onBack={() => navigation.goBack()} />
        <View className="px-4 pt-4">
          <Skeleton width="100%" height={384} borderRadius={12} className="mb-4" />
          <Skeleton width="70%" height={24} className="mb-2" />
          <Skeleton width="40%" height={16} className="mb-6" />
          <Skeleton width="100%" height={80} className="mb-6" />
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} width="100%" height={60} className="mb-2" />
          ))}
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !show) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <DetailHeader title={title} onBack={() => navigation.goBack()} />
        <NetworkError onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  const posterUrl = getPosterUrl(show.posterPath, 500);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <DetailHeader
        title={show.title}
        onBack={() => navigation.goBack()}
        rightElement={
          show.type === "movie" ? (
            <TouchableOpacity
              onPress={handleToggleWatched}
              disabled={upsertTracking.isPending}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={trackingEntry?.status === "completed" ? "checkmark-circle" : "ellipse-outline"}
                size={26}
                color={trackingEntry?.status === "completed" ? colors.primary : colors.text}
              />
            </TouchableOpacity>
          ) : show.type === "tv" ? (
            <TouchableOpacity
              onPress={handleMarkAllAired}
              disabled={markAllAired.isPending || toggleEpisode.isPending}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t("screens.showDetail.markAllAired")}
            >
              <Ionicons
                name={allAiredWatched ? "checkmark-circle" : "checkmark-done-outline"}
                size={26}
                color={colors.primary}
              />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingBottom: 100,
          ...(isDesktopWeb ? { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingTop: 16 } : {}),
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => throttledRefresh(handleRefresh)} tintColor={colors.primary} />}
      >
        <View
          className="overflow-hidden bg-surface-light"
          style={isDesktopWeb ? { width: 280, aspectRatio: 2 / 3, borderRadius: 12, marginRight: 24 } : { width: "100%", height: 384 }}
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="w-full"
              style={{ aspectRatio: 2 / 3 }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-surface-light items-center justify-center">
              <Text className="text-text-muted">{t("common.noImage")}</Text>
            </View>
          )}
        </View>

        <View className={isDesktopWeb ? "flex-1 px-4" : "px-4"} style={isDesktopWeb ? { flex: 1 } : undefined}>
          {show.overview && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.synopsis")}</Text>
              <Text className="text-text leading-relaxed">{show.overview}</Text>
            </View>
          )}

          <View className="flex-row items-center mb-6">
            <View className="bg-surface rounded-full px-3 py-1 mr-2">
              <Text className="text-text text-xs font-medium">
                {show.type === "tv" ? t("common.tv") : t("common.movie")}
              </Text>
            </View>
            {show.firstAirDate && (
              <View className="bg-surface rounded-full px-3 py-1">
                <Text className="text-text text-xs font-medium">
                  {new Date(show.firstAirDate).getFullYear().toString()}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap mb-6 gap-2">
            <RatingCard
              value={ratings?.user.show ?? null}
              onChange={(value) => {
                log("ShowDetail", "rating change", { showId: show.id, value });
                upsertRating.mutate({ value });
              }}
            />
            <RatingCard
              communityData={ratings?.community.show ?? null}
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
                  <Text className="text-text font-medium">{getTmdbStatusLabel(t, show.status)}</Text>
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

          {commentCountData && commentCountData.total > 0 ? (
            <TouchableOpacity
              onPress={handleOpenComments}
              className="flex-row items-center justify-between bg-surface rounded-xl p-4 mb-6"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center mr-3">
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                </View>
                <Text className="text-text font-semibold">{t("screens.showDetail.comments")}</Text>
                <View className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
                  <Text className="text-primary text-xs font-semibold">{commentCountData.total}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleOpenComments}
              className="py-12 items-center justify-center bg-surface rounded-xl mb-6"
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
              <Text className="text-text-muted mt-2 text-center">{t("screens.comments.empty")}</Text>
              <Text className="text-text-muted text-sm text-center">{t("screens.comments.beFirst")}</Text>
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
                onMarkSeasonAired={handleMarkSeasonAired}
                isPending={toggleEpisode.isPending || markAllAired.isPending}
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
        disabled={isAnyPending || deleteTracking.isPending}
        onToggleWatched={undefined}
        onToggleDropped={show.type === "tv" ? handleToggleDropped : undefined}
      />

      <TrackingActionModal
        visible={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
        show={show}
        trackingEntry={trackingEntry}
        rating={ratings?.user.show ?? null}
        onSave={handleSaveTracking}
        isPending={upsertTracking.isPending || markUpTo.isPending}
      />
    </ScreenContainer>
  );
}

function CastMemberCard({ member }: { member: CastMember }) {
  const { t } = useI18n();
  const colors = useThemeColors();
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
  const colors = useThemeColors();
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
