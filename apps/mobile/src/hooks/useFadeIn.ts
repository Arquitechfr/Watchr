import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";

const FADE_DURATION = 280;
const SLIDE_OFFSET = 24;
const SLIDE_DURATION = 320;

export function useFadeIn() {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(SLIDE_OFFSET);

  useEffect(() => {
    if (isFocused) {
      opacity.value = withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = 0;
      translateY.value = SLIDE_OFFSET;
    }
  }, [isFocused, opacity, translateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { containerAnimatedStyle };
}
