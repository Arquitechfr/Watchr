import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";

const FADE_DURATION = 300;
const SCALE_DURATION = 350;

export function useHeroTransition() {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    if (isFocused) {
      opacity.value = withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) });
      scale.value = withTiming(1, { duration: SCALE_DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = 0;
      scale.value = 0.92;
    }
  }, [isFocused, opacity, scale]);

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return { heroAnimatedStyle };
}
