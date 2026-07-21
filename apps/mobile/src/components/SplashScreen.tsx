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
import { darkColors } from "../theme/colors";
import type { SupportedLocale } from "../i18n/translations";

const SPLASH_IMAGES: Record<SupportedLocale, ImageSourcePropType> = {
  en: require("../../assets/splash-background.webp"),
  fr: require("../../assets/splash-background-fr.webp"),
  es: require("../../assets/splash-background-es.webp"),
  pt: require("../../assets/splash-background-pt.webp"),
  de: require("../../assets/splash-background-de.webp"),
  it: require("../../assets/splash-background-it.webp"),
  ar: require("../../assets/splash-background-ar.webp"),
  nl: require("../../assets/splash-background.webp"),
  pl: require("../../assets/splash-background.webp"),
  tr: require("../../assets/splash-background.webp"),
  ru: require("../../assets/splash-background.webp"),
  ja: require("../../assets/splash-background.webp"),
  ko: require("../../assets/splash-background.webp"),
  zh: require("../../assets/splash-background.webp"),
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
    <View style={[StyleSheet.absoluteFill, styles.background]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: darkColors.background,
  },
  loaderContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
