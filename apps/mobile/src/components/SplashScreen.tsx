import { useEffect, useState } from "react";
import { StyleSheet, ImageBackground, ActivityIndicator, View } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  runOnJS,
  useAnimatedStyle,
  withDelay,
} from "react-native-reanimated";

interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  const opacity = useSharedValue(0);
  const [rendered, setRendered] = useState(true);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  useEffect(() => {
    if (!visible) {
      opacity.value = withDelay(
        1500,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(setRendered)(false);
        }),
      );
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!rendered) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, containerStyle]}
    >
      <ImageBackground
        source={require("../../assets/splash-background.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#C65D3A" />
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
