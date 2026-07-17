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
import { getPosterUrl, Episode } from "../services/shows.service";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { WatchStatus } from "../services/tracking.service";
import { useUIStore } from "../store/uiStore";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";
import { useErrorMessage, getNetworkErrorVariant } from "../services/api";
import { useSimilarShows } from "../hooks/useSimilarShows";
import { useEnrichedTags } from "../hooks/useEnrichedTags";
import { Seo } from "../components/Seo";
import { HeroImage } from "../components/HeroImage";
import { SegmentedControl } from "../components/SegmentedControl";
import { useHeroTransition } from "../hooks/useHeroTransition";
import { InfoCard } from "../components/ShowDetail/InfoCard";
import { GenresSection } from "../components/ShowDetail/GenresSection";
import { CastCrewSection } from "../components/ShowDetail/CastCrewSection";
import { CommentsSection } from "../components/ShowDetail/CommentsSection";
import { SimilarShowsSection } from "../components/ShowDetail/SimilarShowsSection";
import { NextEpisodeCard } from "../components/ShowDetail/NextEpisodeCard";

type ShowDetailRouteProp = RouteProp<RootStackParamList, "ShowDetail">;
type ShowDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

export function ShowDetailScreen() {
  const route = useRoute<ShowDetailRouteProp>();
  const { heroAnimatedStyle } = useHeroTransition();
  const navigation = useNavigation<ShowDetailNavigationProp>();
  const { tmdbId, title } = route.params;
  const { showSnackbar, showAlert } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const colors = useThemeColors();
  const isValidTmdbId = Number.isFinite(tmdbId) && tmdbId > 0;
  const { data: similarData, isLoading: similarLoading } = useSimilarShows(isValidTmdbId ? tmdbId : undefined);
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const isWideWeb = Platform.OS === "web" && width >= 1280;

  const { data: show, isLoading, isRefetching, isError, error, refetch } = useShowDetails(tmdbId);
  const { data: enrichedTagsData } = useEnrichedTags(isValidTmdbId ? tmdbId : 0, show?.type);
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
  const [activeDetailTab, setActiveDetailTab] = useState("overview");

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
              upsertRating.mutate(
                { value: payload.rating },
                { onError: (err) => showSnackbar(getErrorMessage(err), "error") },
              );
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
              upsertRating.mutate(
                { value: payload.rating },
                { onError: (err) => showSnackbar(getErrorMessage(err), "error") },
              );
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
      <ScreenContainer edges={["top", "left", "right"]} fullWidth>
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
      <ScreenContainer edges={["top", "left", "right"]} fullWidth>
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
      <ScreenContainer edges={["top", "left", "right"]} fullWidth>
        <DetailHeader title={title} onBack={() => navigation.goBack()} />
        <NetworkError variant={getNetworkErrorVariant(error)} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  const posterUrl = getPosterUrl(show.posterPath, 500);

  return (
    <ScreenContainer edges={["top", "left", "right"]} fullWidth>
      <Seo
        title={show.title}
        description={show.overview}
        image={show.posterPath ? getPosterUrl(show.posterPath, 500) : undefined}
        type="video.other"
      />
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
        {isDesktopWeb ? (
          <View
            className="overflow-hidden bg-surface-light"
            style={{ width: isWideWeb ? 320 : 280, aspectRatio: 2 / 3, borderRadius: 12, marginRight: 24 }}
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
        ) : (
          <HeroImage
            posterPath={show.posterPath}
            backdropPath={show.backdropPath}
            title={show.title}
            subtitle={[
              show.type === "tv" ? t("common.tv") : t("common.movie"),
              show.firstAirDate ? new Date(show.firstAirDate).getFullYear().toString() : null,
            ].filter(Boolean).join(" · ")}
            animatedStyle={heroAnimatedStyle}
          />
        )}

        <View className={isDesktopWeb ? "flex-1 px-4" : "px-4"} style={isDesktopWeb ? { flex: 1, maxWidth: isWideWeb ? 900 : undefined } : undefined}>
          {show.overview && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.synopsis")}</Text>
              <Text className="text-text leading-relaxed">{show.overview}</Text>
            </View>
          )}

          {isDesktopWeb && (
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
          )}

          <View className="flex-row flex-wrap mb-6 gap-2">
            <RatingCard
              value={ratings?.user.show ?? null}
              onChange={(value) => {
                log("ShowDetail", "rating change", { showId: show.id, value });
                upsertRating.mutate(
                  { value },
                  { onError: (err) => showSnackbar(getErrorMessage(err), "error") },
                );
              }}
            />
            <RatingCard
              communityData={ratings?.community.show ?? null}
            />
          </View>

          <GenresSection
            genres={show.genres ?? []}
            aiTags={enrichedTagsData?.source === "ai" ? enrichedTagsData.tags : undefined}
          />

          <InfoCard
            trackingStatus={trackingEntry ? (trackingEntry.status as WatchStatus) : null}
            tmdbStatus={show.status}
            type={show.type}
            numberOfSeasons={show.numberOfSeasons}
            numberOfEpisodes={show.numberOfEpisodes}
            runtime={show.runtime}
            voteAverage={show.voteAverage}
            voteCount={show.voteCount}
            networks={show.networks}
          />

          {show.type === "tv" && show.nextEpisodeToAir && new Date(show.nextEpisodeToAir.airDate) > new Date() && (
            <NextEpisodeCard
              showId={show.id}
              tmdbId={tmdbId}
              title={show.title}
              posterPath={show.posterPath}
              season={show.nextEpisodeToAir.season}
              episode={show.nextEpisodeToAir.episode}
              airDate={show.nextEpisodeToAir.airDate}
              onPress={() => navigation.navigate("EpisodeDetail", {
                showId: show.id,
                tmdbId,
                season: show.nextEpisodeToAir!.season,
                episodeNumber: show.nextEpisodeToAir!.episode,
                title: show.title,
              })}
            />
          )}

          {/* Mobile: tabbed sections. Desktop: all visible */}
          {!isDesktopWeb && show.type === "tv" && show.seasons.length > 0 && (
            <View className="mb-4">
              <SegmentedControl
                options={[
                  { key: "overview", label: t("screens.showDetail.tabOverview") },
                  { key: "episodes", label: t("screens.showDetail.tabEpisodes") },
                  { key: "cast", label: t("screens.showDetail.tabCast") },
                  { key: "comments", label: t("screens.showDetail.tabComments") },
                ]}
                active={activeDetailTab}
                onChange={setActiveDetailTab}
              />
            </View>
          )}

          {/* Overview tab — always visible on desktop or when tab is "overview" */}
          {(isDesktopWeb || activeDetailTab === "overview" || (show.type !== "tv" || show.seasons.length === 0)) && (
            <>
              <CastCrewSection cast={show.cast} crew={show.crew} type={show.type} />

              <CommentsSection
                commentCount={commentCountData?.total ?? 0}
                onPress={handleOpenComments}
              />
            </>
          )}

          {/* Episodes tab */}
          {!isDesktopWeb && activeDetailTab === "episodes" && show.type === "tv" && show.seasons.length > 0 && (
            <View className="mb-6">
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

          {/* Cast tab (mobile only, when explicitly selected) */}
          {!isDesktopWeb && activeDetailTab === "cast" && (
            <CastCrewSection cast={show.cast} crew={show.crew} type={show.type} />
          )}

          {/* Comments tab (mobile only) */}
          {!isDesktopWeb && activeDetailTab === "comments" && (
            <CommentsSection
              commentCount={commentCountData?.total ?? 0}
              onPress={handleOpenComments}
            />
          )}

          {/* Desktop: episodes always visible after cast */}
          {isDesktopWeb && show.type === "tv" && show.seasons.length > 0 && (
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

          <SimilarShowsSection
            shows={similarData?.shows ?? []}
            source={similarData?.source}
            isLoading={similarLoading}
            navigation={navigation}
          />
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
