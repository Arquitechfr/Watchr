import { View, StyleProp, ViewStyle, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useEffect } from "react";
import { useThemeColors } from "../theme/useThemeColors";

interface SkeletonProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  className?: string;
  borderRadius?: number;
}

export function Skeleton({
  width = "100%",
  height = 16,
  className = "",
  borderRadius = 8,
}: SkeletonProps) {
  const colors = useThemeColors();
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 100 }],
  }));

  const style: StyleProp<ViewStyle> = {
    width: width as never,
    height,
    borderRadius,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  };

  if (Platform.OS === "web") {
    return <View className={`bg-surface-light ${className}`} style={style} />;
  }

  return (
    <Animated.View style={[style]} className={`bg-surface-light ${className}`}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "30%",
            backgroundColor: "rgba(255,255,255,0.06)",
          },
          shimmerStyle,
        ]}
      />
    </Animated.View>
  );
}

export function ShowCardSkeleton() {
  return (
    <View className="flex-row items-center bg-surface rounded-xl p-3 mb-3">
      <Skeleton width={80} height={112} borderRadius={8} />
      <View className="flex-1 ml-4">
        <Skeleton width="70%" height={18} className="mb-2" />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}
