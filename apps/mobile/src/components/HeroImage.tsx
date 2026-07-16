import { View, Text, Platform, useWindowDimensions, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { getBackdropUrl, getPosterUrl } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface HeroImageProps {
  posterPath?: string;
  backdropPath?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  animatedStyle?: AnimatedStyle<ViewStyle>;
}

export function HeroImage({ posterPath, backdropPath, title, subtitle, children, animatedStyle }: HeroImageProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const heroUrl = getBackdropUrl(backdropPath, 780) ?? getPosterUrl(posterPath, 500);
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const heroHeight = isDesktopWeb ? 360 : 280;

  return (
    <Animated.View style={[{ width: "100%", height: heroHeight, position: "relative" }, animatedStyle]}>
      {heroUrl ? (
        <Animated.Image
          source={{ uri: heroUrl }}
          style={{ width: "100%", height: heroHeight }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: heroHeight,
            backgroundColor: colors.surfaceLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-text-muted text-sm">{t("common.noImage")}</Text>
        </View>
      )}

      <LinearGradient
        colors={[colors.background + "00", colors.background + "80", colors.background]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: heroHeight * 0.7,
        }}
      />

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: isDesktopWeb ? 48 : 16,
          paddingBottom: 16,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit_700Bold",
            fontSize: isDesktopWeb ? 28 : 22,
            color: colors.text,
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontSize: 14,
              color: colors.textMuted,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </Animated.View>
  );
}
