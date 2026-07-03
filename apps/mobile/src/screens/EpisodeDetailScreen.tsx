import { useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useShowDetails } from "../hooks/useShowDetails";
import { useSeasonDetails } from "../hooks/useSeasonDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useToggleEpisode, useMarkUpTo } from "../hooks/useTracking";
import { WatchedEpisode } from "../services/tracking.service";
import { useRatingsForShow, useUpsertRating } from "../hooks/useRatings";
import { useCommentsForShow } from "../hooks/useComments";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { RatingStars } from "../components/RatingStars";
import { CommentItem } from "../components/Comments/CommentItem";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  getStillUrl,
  getProfileUrl,
  Episode,
  Season,
  CastMember,
} from "../services/shows.service";
import { Comment } from "../services/comments.service";
import { colors } from "../theme/colors";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";

type EpisodeDetailRouteProp = RouteProp<RootStackParamList, "EpisodeDetail">;
type EpisodeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "EpisodeDetail">;

export function EpisodeDetailScreen() {
  const route = useRoute<EpisodeDetailRouteProp>();
  const navigation = useNavigation<EpisodeDetailNavigationProp>();
  const { showId, tmdbId, season, episodeNumber, title } = route.params;
  const { showSnackbar } = useUIStore();
  const { t, dateFnsLocale } = useI18n();

  const { data: show, isLoading: isLoadingShow, isError: isErrorShow, refetch: refetchShow } = useShowDetails(tmdbId);
  const {
    data: seasonDetails,
    isLoading: isLoadingSeason,
    isError: isErrorSeason,
    refetch: refetchSeason,
  } = useSeasonDetails(tmdbId, season);
  const { data: trackingEntry, refetch: refetchTrackingEntry } = useTrackingEntry(showId);
  const { data: ratings, refetch: refetchRatings } = useRatingsForShow(showId);
  const { data: commentsData, refetch: refetchComments } = useCommentsForShow(showId, { season, episode: episodeNumber });
  const throttledRefresh = useRefreshRateLimit();
  const toggleEpisode = useToggleEpisode(showId);
  const markUpTo = useMarkUpTo(showId);
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
    const found = ratings?.episodes.find((e: { season: number; episode: number; value: number }) => e.season === season && e.episode === episodeNumber);
    return found?.value ?? null;
  }, [ratings, season, episodeNumber]);

  const previewComments = useMemo<Comment[]>(() => (commentsData?.comments ?? []).slice(0, 3), [commentsData]);

  useEffect(() => {
    const headerTitle = title ?? episode?.name ?? `S${season}E${episodeNumber}`;
    navigation.setOptions({ title: headerTitle });
  }, [navigation, title, episode, season, episodeNumber]);

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

    Alert.alert(
      t("screens.episode.markPreviousTitle"),
      t("screens.episode.markPreviousMessage", { count: previousUnwatched.length }),
      [
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
    );
  };

  const handleToggleSeason = () => {
    if (!show || show.type !== "tv") return;
    const seasonEpisodes = show.seasons
      .filter((s: Season) => s.seasonNumber === season)
      .flatMap((s: Season) => {
        const count = s.episodeCount ?? s.episodes?.length ?? 0;
        return Array.from({ length: count }, (_, i) => i + 1).map((ep: number) => ({ season: s.seasonNumber, episode: ep }));
      });
    const seasonWatched = seasonEpisodes.every((ep: { season: number; episode: number }) => watchedKeys.has(`${ep.season}-${ep.episode}`));
    const targetWatched = !seasonWatched;

    if (targetWatched) {
      const lastEpisode = seasonEpisodes[seasonEpisodes.length - 1];
      markUpTo.mutate(
        { season: lastEpisode.season, episode: lastEpisode.episode, includePrevious: true },
        { onError: () => showSnackbar(t("screens.episode.seasonError"), "error") },
      );
    } else {
      const promises = seasonEpisodes.map((ep: { season: number; episode: number }) =>
        toggleEpisode.mutateAsync({ season: ep.season, episode: ep.episode, watched: false }),
      );
      Promise.all(promises).catch(() => showSnackbar(t("screens.episode.seasonError"), "error"));
    }
  };

  const handleShare = async () => {
    try {
      const message = `${show?.title ?? ""} — S${season}E${episodeNumber}${episode?.name ? ` : ${episode.name}` : ""}`;
      await Share.share({ message, title: show?.title ?? t("common.appName") });
    } catch (err) {
      log("EpisodeDetail", "share error", err);
    }
  };

  const handleOpenComments = () => {
    navigation.navigate("ShowComments", {
      showId,
      title: episode?.name ?? `S${season}E${episodeNumber}`,
      season,
      episode: episodeNumber,
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
      { onError: () => showSnackbar(t("screens.episode.ratingError"), "error") },
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
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
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
    return (
      <ScreenContainer>
        <NetworkError onRetry={() => refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
      >
        <View className="relative">
          {stillUrl ? (
            <Image source={{ uri: stillUrl }} className="w-full h-64 bg-surface-light" resizeMode="cover" />
          ) : (
            <View className="w-full h-64 bg-surface-light items-center justify-center">
              <Ionicons name="image-outline" size={64} color={colors.textMuted} />
            </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <View className="absolute top-4 left-4">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 -mt-6">
          <View className="flex-row items-center mb-1">
            <Text className="text-primary font-bold text-base">S{season}E{episodeNumber}</Text>
            {isWatched && (
              <View className="ml-3 px-2 py-1 rounded-full bg-primary/20">
                <Text className="text-primary text-xs font-semibold">{t("screens.episode.watched")}</Text>
              </View>
            )}
          </View>
          <Text className="text-text text-2xl font-bold mb-2">
            {episode?.name ?? `${t("screens.showDetail.episode")} ${episodeNumber}`}
          </Text>
          <View className="flex-row flex-wrap items-center mb-4">
            {airDate && !Number.isNaN(airDate.getTime()) && (
              <Text className="text-text-muted text-sm mr-4">
                {format(airDate, "EEEE d MMMM yyyy", { locale: dateFnsLocale })}
              </Text>
            )}
            {episode?.runtime && (
              <Text className="text-text-muted text-sm">{episode.runtime} {t("common.minutesShort")}</Text>
            )}
          </View>

          {episode?.overview ? (
            <Text className="text-text leading-relaxed mb-6">{episode.overview}</Text>
          ) : (
            <Text className="text-text-muted italic mb-6">{t("screens.episode.noOverview")}</Text>
          )}

          <View className="flex-row flex-wrap mb-6">
            <TouchableOpacity
              onPress={handleToggleWatched}
              disabled={toggleEpisode.isPending || markUpTo.isPending}
              className={`flex-row items-center px-4 py-3 rounded-lg mr-2 mb-2 ${isWatched ? "bg-surface border border-primary" : "bg-primary"}`}
              activeOpacity={0.7}
            >
              <Ionicons name={isWatched ? "checkmark-circle" : "ellipse-outline"} size={18} color={isWatched ? colors.primary : colors.background} />
              <Text className={`font-semibold ml-2 ${isWatched ? "text-primary" : "text-background"}`}>
                {isWatched ? t("screens.episode.unwatched") : t("screens.episode.watched")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleSeason}
              disabled={toggleEpisode.isPending || markUpTo.isPending}
              className="flex-row items-center px-4 py-3 rounded-lg bg-surface border border-border mr-2 mb-2"
              activeOpacity={0.7}
            >
              <Ionicons name="albums-outline" size={18} color={colors.primary} />
              <Text className="font-semibold ml-2 text-text">{t("screens.showDetail.season")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="flex-row items-center px-4 py-3 rounded-lg bg-surface border border-border mr-2 mb-2"
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={18} color={colors.primary} />
              <Text className="font-semibold ml-2 text-text">{t("common.share")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenComments}
              className="flex-row items-center px-4 py-3 rounded-lg bg-surface border border-border mb-2"
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              <Text className="font-semibold ml-2 text-text">{t("screens.showDetail.comments")}</Text>
            </TouchableOpacity>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.yourRating")}</Text>
            <RatingStars value={episodeRating} onChange={handleRatingChange} />
          </View>

          {show.cast && show.cast.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.cast")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {show.cast.slice(0, 10).map((member: CastMember, index: number) => (
                  <CastMemberCard key={`${member.id}-${index}`} member={member} />
                ))}
              </ScrollView>
            </View>
          )}

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-text">{t("screens.showDetail.comments")}</Text>
              <TouchableOpacity onPress={handleOpenComments} activeOpacity={0.7}>
                <Text className="text-primary text-sm font-semibold">{t("common.seeAll")}</Text>
              </TouchableOpacity>
            </View>
            {previewComments.length > 0 ? (
              previewComments.map((comment: Comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            ) : (
              <View className="py-12 items-center justify-center bg-surface rounded-lg">
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text className="text-text-muted mt-2 text-center">{t("screens.comments.empty")}</Text>
                <Text className="text-text-muted text-sm text-center">{t("screens.comments.beFirst")}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-background border-t border-border flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => previousEpisode && handleNavigate(previousEpisode)}
          disabled={!previousEpisode}
          className={`flex-row items-center px-4 py-2 rounded-lg ${previousEpisode ? "bg-surface" : "opacity-30"}`}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text className="text-text ml-1 text-sm">{t("common.previous")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => nextEpisode && handleNavigate(nextEpisode)}
          disabled={!nextEpisode}
          className={`flex-row items-center px-4 py-2 rounded-lg ${nextEpisode ? "bg-surface" : "opacity-30"}`}
          activeOpacity={0.7}
        >
          <Text className="text-text mr-1 text-sm">{t("common.next")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
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
