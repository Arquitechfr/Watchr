import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
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

export function TrafficNoticeBanner() {
  const config = useRemoteConfig();
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const enabled = config.traffic_notice_enabled;
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

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingTop: insets.top,
          backgroundColor: colors.primary,
        },
        Platform.OS === "web" && { maxWidth: 1200, alignSelf: "center" as const },
      ]}
    >
      <View className="flex-row items-center px-4 py-3">
        <Ionicons name="warning" size={20} color={colors.background} />
        <Text
          className="flex-1 ml-3 text-sm"
          style={{ color: colors.background, fontFamily: "Outfit_400Regular" }}
        >
          {t("trafficNotice.message")}
        </Text>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.background} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
