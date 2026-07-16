import { View, Text, Image, TouchableOpacity, Platform } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { getPosterUrl } from "../services/shows.service";
import { UnwatchedEpisode } from "../services/unwatched.service";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { CelebrationCheckmark } from "./CelebrationCheckmark";
import { hapticMedium } from "../utils/haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

interface UnwatchedEpisodeRowProps {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  episode: UnwatchedEpisode;
  isNew?: boolean;
  onPress: () => void;
  onTitlePress?: () => void;
  onMarkWatched?: () => void;
  isMarking?: boolean;
}

const SWIPE_THRESHOLD = 80;

export function UnwatchedEpisodeRow({
  title,
  posterPath,
  episode,
  isNew,
  onPress,
  onTitlePress,
  onMarkWatched,
  isMarking,
}: UnwatchedEpisodeRowProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const posterUrl = getPosterUrl(posterPath, 200);
  const translateX = useSharedValue(0);

  const seasonEpisodeLabel = `S${String(episode.season).padStart(2, "0")} - E${String(episode.episode).padStart(2, "0")}`;

  const airedLabel = episode.airDate
    ? t("screens.unwatched.airedAgo", {
        distance: formatDistanceToNow(new Date(episode.airDate), { addSuffix: true, locale: dateFnsLocale }),
      })
    : null;

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = Math.max(-120, Math.min(120, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD && onMarkWatched) {
        runOnJS(hapticMedium)();
        runOnJS(onMarkWatched)();
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(hapticMedium)();
        runOnJS(onPress)();
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(translateX.value > 20 ? 1 : 0, { duration: 150 }),
    transform: [{ translateX: translateX.value > 0 ? 0 : -100 }],
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(translateX.value < -20 ? 1 : 0, { duration: 150 }),
    transform: [{ translateX: translateX.value < 0 ? 0 : 100 }],
  }));

  const content = (
    <View className="flex-row items-center bg-surface rounded-lg p-3 mb-3">
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-14 h-20 rounded-lg bg-surface-light"
          resizeMode="cover"
        />
      ) : (
        <View className="w-14 h-20 rounded-lg bg-surface-light items-center justify-center">
          <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        {onTitlePress ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onTitlePress();
            }}
            className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5"
            activeOpacity={0.7}
          >
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-surface-light rounded-full px-3 py-1 self-start mb-1.5">
            <Text className="text-text text-xs font-medium" numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
        <Text className="text-text font-bold text-base mb-0.5">
          {seasonEpisodeLabel}
        </Text>
        {episode.name ? (
          <Text className="text-text-muted text-sm" numberOfLines={1}>
            {episode.name}
          </Text>
        ) : null}
        {airedLabel ? (
          <Text className="text-text-muted text-xs mt-0.5">
            {airedLabel}
          </Text>
        ) : null}
        {isNew ? (
          <View className="bg-primary rounded-full px-2 py-0.5 self-start mt-1.5">
            <Text className="text-background text-xs font-semibold">
              {t("common.newEpisode")}
            </Text>
          </View>
        ) : null}
      </View>
      {onMarkWatched && (
        <CelebrationCheckmark
          onPress={onMarkWatched}
          isMarking={isMarking}
          size={28}
          color={colors.primary}
          containerStyle={{ marginLeft: 8 }}
          buttonStyle={{ padding: 4 }}
        />
      )}
    </View>
  );

  if (Platform.OS === "web" || !onMarkWatched) {
    return (
      <TouchableOpacity
        className="active:opacity-70"
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="relative mb-3">
      <View className="absolute inset-0 flex-row items-center justify-between px-4">
        <Animated.View
          style={[{
            backgroundColor: colors.primary,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
          }, leftActionStyle]}
        >
          <Ionicons name="eye-outline" size={20} color="#fff" />
          <Text className="text-white font-semibold ml-1.5 text-sm">{t("screens.unwatched.viewDetail")}</Text>
        </Animated.View>
        <Animated.View
          style={[{
            backgroundColor: colors.success ?? "#4CAF50",
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
          }, rightActionStyle]}
        >
          <Text className="text-white font-semibold mr-1.5 text-sm">{t("screens.unwatched.markWatched")}</Text>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </Animated.View>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardAnimatedStyle}>
          <TouchableOpacity
            className="active:opacity-70"
            onPress={onPress}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

