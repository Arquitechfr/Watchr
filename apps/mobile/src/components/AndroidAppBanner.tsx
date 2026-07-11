import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Platform, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRemoteConfig } from "../hooks/useRemoteConfig";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.watchr.app";

export function AndroidAppBanner() {
  const config = useRemoteConfig();
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const enabled = Platform.OS === "web" && config.android_app_banner_enabled;
  const [dismissed, setDismissed] = useState(false);
  const prevEnabled = useRef(enabled);

  useEffect(() => {
    if (enabled && !prevEnabled.current) {
      setDismissed(false);
    }
    prevEnabled.current = enabled;
  }, [enabled]);

  const visible = enabled && !dismissed;
  const [rendered, setRendered] = useState<boolean>(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else if (rendered) {
      const timeout = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const translateY = useSharedValue(visible ? 0 : -200);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      translateY.value = withTiming(-200, {
        duration: 250,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible]);

  if (!rendered) return null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function handleDownload() {
    if (Platform.OS === "web") {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99,
          paddingTop: insets.top,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        Platform.OS === "web" && { maxWidth: 1200, alignSelf: "center" as const },
      ]}
    >
      <View className="flex-row items-center px-4 py-3" style={{ gap: 12 }}>
        <Ionicons name="logo-google-playstore" size={22} color={colors.primary} />
        <Text
          className="flex-1 text-sm"
          style={{ color: colors.text, fontFamily: "Outfit_400Regular" }}
        >
          {t("androidAppBanner.message")}
        </Text>
        <Pressable
          onPress={handleDownload}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontFamily: "Outfit_600SemiBold",
              fontSize: 13,
            }}
          >
            {t("androidAppBanner.download")}
          </Text>
        </Pressable>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
