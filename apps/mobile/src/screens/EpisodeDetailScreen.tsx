import { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  RefreshControl,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useShowDetails } from "../hooks/useShowDetails";
import { useSeasonDetails } from "../hooks/useSeasonDetails";
import { useEpisodeSummary } from "../hooks/useEpisodeSummary";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useToggleEpisode, useMarkUpTo } from "../hooks/useTracking";
import { WatchedEpisode } from "../services/tracking.service";
import { useRatingsForShow, useUpsertRating } from "../hooks/useRatings";
import { useCommentsForShow } from "../hooks/useComments";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { DetailHeader } from "../components/DetailHeader";
import { ScrollArrows } from "../components/ScrollArrows";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { RatingCard } from "../components/RatingCard";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  getStillUrl,
  Episode,
  Season,
  CastMember,
} from "../services/shows.service";
import { Comment } from "../services/comments.service";
import { useThemeColors } from "../theme/useThemeColors";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";
import { useErrorMessage, getNetworkErrorVariant } from "../services/api";
import { Seo } from "../components/Seo";
import { CastMemberCard } from "../components/ShowDetail/PersonCards";
import { EpisodeHeader } from "../components/EpisodeDetail/EpisodeHeader";
import { EpisodeActions } from "../components/EpisodeDetail/EpisodeActions";
import { EpisodeCommentsPreview } from "../components/EpisodeDetail/EpisodeCommentsPreview";
import { EpisodeNavigation } from "../components/EpisodeDetail/EpisodeNavigation";
import { EpisodeCommunityStatsCard } from "../components/EpisodeDetail/EpisodeCommunityStatsCard";
import { EpisodeTriviaCard } from "../components/EpisodeDetail/EpisodeTriviaCard";
import { useEpisodeCommunity } from "../hooks/useEpisodeCommunity";
import { useFadeIn } from "../hooks/useFadeIn";
import Animated from "react-native-reanimated";

type EpisodeDetailRouteProp = RouteProp<RootStackParamList, "EpisodeDetail">;
type EpisodeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "EpisodeDetail">;

export function EpisodeDetailScreen() {
  const route = useRoute<EpisodeDetailRouteProp>();
  const navigation = useNavigation<EpisodeDetailNavigationProp>();
  const { showId, tmdbId, season, episodeNumber, title } = route.params;
  const castScrollRef = useRef<ScrollView>(null);
  const { showSnackbar, showAlert } = useUIStore();
  const { t, dateFnsLocale } = useI18n();
  const getErrorMessage = useErrorMessage();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;

  const { data: show, isLoading: isLoadingShow, isError: isErrorShow, error: showError, refetch: refetchShow } = useShowDetails(tmdbId);
  const {
    data: seasonDetails,
    isLoading: isLoadingSeason,
    isError: isErrorSeason,
    error: seasonError,
    refetch: refetchSeason,
  } = useSeasonDetails(tmdbId, season);
  const { data: trackingEntry, refetch: refetchTrackingEntry } = useTrackingEntry(showId);
  const { data: ratings, refetch: refetchRatings } = useRatingsForShow(showId);
  const { data: commentsData, refetch: refetchComments } = useCommentsForShow(showId, { season, episode: episodeNumber });
  const { data: episodeSummary, isLoading: summaryLoading } = useEpisodeSummary(tmdbId, season, episodeNumber);
  const { data: episodeCommunity } = useEpisodeCommunity(tmdbId, season, episodeNumber);
  const { containerAnimatedStyle } = useFadeIn();
  const throttledRefresh = useRefreshRateLimit();
  const toggleEpisode = useToggleEpisode(showId, tmdbId);
  const markUpTo = useMarkUpTo(showId, tmdbId);
  const upsertRating = useUpsertRating(showId);

  const episode = useMemo<Episode | undefined>(() => {
    if (!seasonDetails) return undefined;
    return seasonDetails.episodes.find((e: Episode) => e.episodeNumber === episodeNumber);
  }, [seasonDetails, episodeNumber]);

  const allEpisodes = useMemo<Array<{ season: number; episode: number }>>(() => {
    if (!show) return [];
    return show.seasons.flatMap((s: Season) =>
      Array.from({ length: s.episodeCount }, (_, i) => i + 1).map((ep: number) => ({ season: s.seasonNumber, episode: ep })),
    );
  }, [show]);

  const currentIndex = useMemo<number>(
    () => allEpisodes.findIndex((e) => e.season === season && e.episode === episodeNumber),
    [allEpisodes, season, episodeNumber],
  );

  const previousEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : undefined;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : undefined;

  const watchedKeys = useMemo<Set<string>>(
    () =>
      new Set(
        (trackingEntry?.watchedEpisodes ?? []).map((ep: WatchedEpisode) => `${ep.season}-${ep.episode}`),
      ),
    [trackingEntry?.watchedEpisodes],
  );

  const isWatched = watchedKeys.has(`${season}-${episodeNumber}`);

  const episodeRating = useMemo(() => {
    const found = ratings?.user.episodes.find((e: { season: number; episode: number; value: number }) => e.season === season && e.episode === episodeNumber);
    return found?.value ?? null;
  }, [ratings, season, episodeNumber]);

  const communityEpisodeRating = useMemo(() => {
    const found = ratings?.community.episodes.find((e: { season: number; episode: number; average: number; count: number }) => e.season === season && e.episode === episodeNumber);
    return found ?? ratings?.community.show ?? null;
  }, [ratings, season, episodeNumber]);

  const previewComments = useMemo<Comment[]>(() => (commentsData?.comments ?? []).slice(0, 3), [commentsData]);

  useEffect(() => {
    if (show) {
      log("EpisodeDetail", "show data", {
        tmdbId,
        hasCast: Boolean(show.cast?.length),
        castCount: show.cast?.length ?? 0,
        crewCount: show.crew?.length ?? 0,
        hasSeasonDetails: Boolean(seasonDetails),
        episodeCount: seasonDetails?.episodes.length ?? 0,
      });
    }
  }, [show, seasonDetails, tmdbId]);

  const handleToggleWatched = () => {
    if (!show || show.type !== "tv") return;
    const nextIsWatched = !isWatched;
    if (!nextIsWatched) {
      toggleEpisode.mutate({ season, episode: episodeNumber, watched: false });
      return;
    }

    const previousUnwatched = show.seasons.flatMap((s: Season) => {
      const count = s.episodeCount ?? s.episodes?.length ?? 0;
      const numbers = Array.from({ length: count }, (_, i) => i + 1);
      return numbers
        .filter((ep: number) => {
          if (s.seasonNumber < season) return true;
          if (s.seasonNumber > season) return false;
          return ep < episodeNumber;
        })
        .map((ep: number) => ({ season: s.seasonNumber, episode: ep }));
    }).filter((ep: { season: number; episode: number }) => !watchedKeys.has(`${ep.season}-${ep.episode}`));

    if (previousUnwatched.length === 0) {
      toggleEpisode.mutate({ season, episode: episodeNumber, watched: true });
      return;
    }

    showAlert({
      title: t("screens.episode.markPreviousTitle"),
      message: t("screens.episode.markPreviousMessage", { count: previousUnwatched.length }),
      buttons: [
        { text: t("common.no"), style: "cancel", onPress: () => toggleEpisode.mutate({ season, episode: episodeNumber, watched: true }) },
        {
          text: t("common.yes"),
          onPress: () => {
            log("EpisodeDetail", "mark up to", { showId, season, episode: episodeNumber });
            markUpTo.mutate(
              { season, episode: episodeNumber, includePrevious: true },
              { onError: () => showSnackbar(t("screens.episode.markError"), "error") },
            );
          },
        },
      ],
    });
  };

  const handleShare = async () => {
    try {
      const message = `${show?.title ?? ""} — S${season}E${episodeNumber}${episode?.name ? ` : ${episode.name}` : ""}`;
      await Share.share({ message, title: show?.title ?? t("common.appName") });
    } catch (err) {
      log("EpisodeDetail", "share error", err);
    }
  };

  const navigateToComments = () => {
    navigation.navigate("ShowComments", {
      showId,
      title: episode?.name ?? `S${season}E${episodeNumber}`,
      season,
      episode: episodeNumber,
    });
  };

  const handleOpenComments = () => {
    if (isWatched) {
      navigateToComments();
      return;
    }
    showAlert({
      title: t("screens.comments.spoilerWarningTitle"),
      message: t("screens.comments.spoilerWarningMessage", { title: episode?.name ?? `S${season}E${episodeNumber}` }),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("screens.comments.proceedAnyway"),
          onPress: navigateToComments,
        },
        {
          text: t("screens.comments.markWatchedAndProceed"),
          onPress: () => {
            toggleEpisode.mutate(
              { season, episode: episodeNumber, watched: true },
              {
                onSuccess: () => navigateToComments(),
                onError: () => showSnackbar(t("screens.episode.markError"), "error"),
              },
            );
          },
        },
      ],
    });
  };

  const handleNavigate = (target: { season: number; episode: number }) => {
    navigation.push("EpisodeDetail", {
      showId,
      tmdbId,
      season: target.season,
      episodeNumber: target.episode,
    });
  };

  const handleRatingChange = (value: number) => {
    upsertRating.mutate(
      { value, episodeRef: { season, episode: episodeNumber } },
      { onError: (err) => showSnackbar(getErrorMessage(err), "error") },
    );
  };

  const airDate = episode?.airDate ? new Date(episode.airDate) : null;
  const stillUrl = getStillUrl(episode?.stillPath, 500);
  const isLoading = isLoadingShow || isLoadingSeason;
  const isError = isErrorShow || isErrorSeason;

  const refetch = () => {
    refetchShow();
    refetchSeason();
    refetchTrackingEntry();
    refetchRatings();
    refetchComments();
  };

  if (isLoading || !show || !seasonDetails) {
    const headerTitle = title ?? `S${season}E${episodeNumber}`;
    return (
      <ScreenContainer edges={["top", "left", "right"]} fullWidth>
        <DetailHeader title={headerTitle} onBack={() => navigation.goBack()} />
        <ScrollView className="flex-1 bg-background">
          <Skeleton width="100%" height={240} borderRadius={0} />
          <View className="px-4 pt-4">
            <Skeleton width="60%" height={28} borderRadius={8} className="mb-2" />
            <Skeleton width="40%" height={16} borderRadius={8} className="mb-4" />
            <Skeleton width="100%" height={80} borderRadius={8} className="mb-4" />
            <Skeleton width="100%" height={48} borderRadius={8} className="mb-4" />
            <Skeleton width="100%" height={120} borderRadius={8} />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (isError) {
    const headerTitle = title ?? `S${season}E${episodeNumber}`;
    return (
      <ScreenContainer edges={["top", "left", "right"]} fullWidth>
        <DetailHeader title={headerTitle} onBack={() => navigation.goBack()} />
        <NetworkError variant={getNetworkErrorVariant(showError ?? seasonError)} onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  const headerTitle = title ?? episode?.name ?? `S${season}E${episodeNumber}`;

  return (
    <ScreenContainer edges={["top", "left", "right"]} fullWidth>
      <Seo
        title={`${show?.title ? show.title + " — " : ""}S${season}E${episodeNumber}${episode?.name ? " — " + episode.name : ""}`}
        description={episode?.overview}
        image={episode?.stillPath ? getStillUrl(episode.stillPath, 500) : undefined}
        type="video.episode"
      />
      <DetailHeader
        title={headerTitle}
        onBack={() => navigation.goBack()}
        onTitlePress={() => navigation.navigate("ShowDetail", { tmdbId, title: show.title })}
        rightElement={
          <TouchableOpacity
            onPress={handleToggleWatched}
            disabled={toggleEpisode.isPending || markUpTo.isPending}
            className="p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isWatched ? "checkmark-circle" : "ellipse-outline"}
              size={26}
              color={isWatched ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        }
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
      >
        <Animated.View className="relative" style={[isDesktopWeb ? { width: "100%", alignItems: "center" } : undefined, containerAnimatedStyle]}>
          {stillUrl ? (
            <Animated.Image source={{ uri: stillUrl }} className="bg-surface-light" style={isDesktopWeb ? { width: "100%", maxWidth: 800, height: 320, borderRadius: 12 } : { width: "100%", height: 256 }} resizeMode="cover" />
          ) : (
            <View className="bg-surface-light items-center justify-center" style={isDesktopWeb ? { width: "100%", maxWidth: 800, height: 320, borderRadius: 12 } : { width: "100%", height: 256 }}>
              <Ionicons name="image-outline" size={64} color={colors.textMuted} />
            </View>
          )}
          {!isDesktopWeb && <View className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />}
        </Animated.View>

        <Animated.View
          className={isDesktopWeb ? "mt-6 px-4 self-center w-full" : "px-4 -mt-6"}
          style={[isDesktopWeb ? { maxWidth: 800 } : undefined, containerAnimatedStyle]}
        >
          <EpisodeHeader
            season={season}
            episodeNumber={episodeNumber}
            isWatched={isWatched}
            airDate={airDate}
            runtime={episode?.runtime}
            networks={show.networks}
          />

          {episode?.overview ? (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.synopsis")}</Text>
              <Text className="text-text leading-relaxed">{episode.overview}</Text>
            </View>
          ) : (
            <Text className="text-text-muted italic mb-6">{t("screens.episode.noOverview")}</Text>
          )}

          {summaryLoading && (
            <View className="flex-row items-center mb-6 bg-surface rounded-lg p-3">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-text-muted text-sm ml-3">{t("screens.episode.aiSummaryLoading")}</Text>
            </View>
          )}

          {episodeSummary && episodeSummary.source === "ai" && !summaryLoading && (
            <View className="mb-6 bg-surface rounded-lg p-4" style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <View className="flex-row items-center mb-2">
                <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2">
                  <Text className="text-primary text-[10px] font-bold">AI</Text>
                </View>
                <Text className="text-text font-semibold text-sm">{t("screens.episode.aiSummaryTitle")}</Text>
              </View>
              <Text className="text-text-muted text-sm leading-relaxed">{episodeSummary.summary}</Text>
            </View>
          )}

          <EpisodeActions
            onShare={handleShare}
            onOpenComments={handleOpenComments}
            commentCount={commentsData?.total ?? 0}
          />

          <View className="flex-row flex-wrap mb-6 gap-2">
            <RatingCard
              value={episodeRating}
              onChange={handleRatingChange}
            />
            <RatingCard
              communityData={communityEpisodeRating}
            />
          </View>

          {show.cast && show.cast.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.cast")}</Text>
              <View className="relative">
              <ScrollView ref={castScrollRef} horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {show.cast.slice(0, 10).map((member: CastMember, index: number) => (
                  <CastMemberCard key={`${member.id}-${index}`} member={member} />
                ))}
              </ScrollView>
              <ScrollArrows scrollRef={castScrollRef} />
              </View>
            </View>
          )}

          <EpisodeCommentsPreview
            comments={previewComments}
            totalCount={commentsData?.total ?? 0}
            onSeeAll={handleOpenComments}
            showId={showId}
            title={episode?.name ?? `S${season}E${episodeNumber}`}
            season={season}
            episode={episodeNumber}
          />

          {episodeCommunity?.stats && (
            <EpisodeCommunityStatsCard stats={episodeCommunity.stats} />
          )}

          {episodeCommunity?.trivia && (
            <EpisodeTriviaCard trivia={episodeCommunity.trivia} />
          )}
        </Animated.View>
      </ScrollView>

      <EpisodeNavigation
        hasPrevious={!!previousEpisode}
        hasNext={!!nextEpisode}
        onPrevious={() => previousEpisode && handleNavigate(previousEpisode)}
        onNext={() => nextEpisode && handleNavigate(nextEpisode)}
        onShowDetail={() => navigation.navigate("ShowDetail", { tmdbId, title: show.title })}
        bottomInset={insets.bottom}
      />
    </ScreenContainer>
  );
}
