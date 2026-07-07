import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  useAnimatedStyle,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { useThemeColors } from "../theme/useThemeColors";

interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  const colors = useThemeColors();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const [rendered, setRendered] = useState(true);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  useEffect(() => {
    if (!visible) {
      opacity.value = withDelay(
        100,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(setRendered)(false);
        }),
      );
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!rendered) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        containerStyle,
        {
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Animated.Image
        source={require("../../assets/splash-icon.png")}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
  },
});
