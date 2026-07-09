import { useEffect, useState } from "react";
import { StyleSheet, ImageBackground, ActivityIndicator, View, ImageSourcePropType } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  runOnJS,
  useAnimatedStyle,
  withDelay,
} from "react-native-reanimated";
import { useLocaleStore } from "../store/localeStore";
import type { SupportedLocale } from "../i18n/translations";

const SPLASH_IMAGES: Record<SupportedLocale, ImageSourcePropType> = {
  en: require("../../assets/splash-background.png"),
  fr: require("../../assets/splash-background-fr.png"),
  es: require("../../assets/splash-background-es.png"),
  pt: require("../../assets/splash-background-pt.png"),
  de: require("../../assets/splash-background-de.png"),
  it: require("../../assets/splash-background-it.png"),
  ar: require("../../assets/splash-background-ar.png"),
};

interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  const locale = useLocaleStore((state) => state.locale);
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
        source={SPLASH_IMAGES[locale] ?? SPLASH_IMAGES.en}
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
