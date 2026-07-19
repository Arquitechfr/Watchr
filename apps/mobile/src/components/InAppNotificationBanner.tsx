import { useEffect, useState, useCallback } from "react";
import { Text, TouchableOpacity, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNotificationStore, type BannerNotification } from "../store/notificationStore";
import { useDismissBanner } from "../hooks/useInAppNotifications";
import { useThemeColors } from "../theme/useThemeColors";
import { RootStackParamList } from "../navigation/RootNavigator";
import { log } from "../utils/logger";

export function InAppNotificationBanner() {
  const banner = useNotificationStore((s) => s.currentBanner);
  const colors = useThemeColors();
  const dismiss = useDismissBanner();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (banner) {
      setRendered(true);
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    } else if (rendered) {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-200, { duration: 250, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(setRendered)(false);
      });
    }
  }, [banner, rendered, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleTap = useCallback(() => {
    if (!banner) return;
    if (banner.data?.screen) {
      const screen = banner.data.screen as string;
      const params = { ...banner.data };
      delete params.screen;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.navigate as any)(screen, params);
      } catch (err) {
        log("InAppNotificationBanner", "navigation failed", err);
      }
    }
    dismiss(banner.serverId);
  }, [banner, dismiss, navigation]);

  const handleClose = useCallback(() => {
    if (!banner) return;
    dismiss(banner.serverId);
  }, [banner, dismiss]);

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationY < -40 || Math.abs(e.translationX) > 100) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  if (!rendered || !banner) return null;

  const currentBanner: BannerNotification = banner;

  const bannerContent = (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: colors.surface,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
        },
        Platform.OS === "web" && { maxWidth: 600, alignSelf: "center" as const, width: "100%" as const },
      ]}
    >
      {currentBanner.imageUrl && (
        <Image
          source={{ uri: currentBanner.imageUrl }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            marginRight: 12,
          }}
          resizeMode="cover"
        />
      )}
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.7}
        style={{ flex: 1 }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
            fontFamily: "Outfit_600SemiBold",
          }}
        >
          {currentBanner.title}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: 2,
            fontFamily: "Outfit_400Regular",
          }}
        >
          {currentBanner.body}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ paddingLeft: 8, paddingRight: 4 }}
      >
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );

  if (Platform.OS === "web") {
    return bannerContent;
  }

  return (
    <GestureDetector gesture={panGesture}>
      {bannerContent}
    </GestureDetector>
  );
}
