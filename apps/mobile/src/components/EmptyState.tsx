import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from "react-native-reanimated";
import { useEffect } from "react";
import { useThemeColors } from "../theme/useThemeColors";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === "web") return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Animated.View
        style={[{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.surfaceLight,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }, Platform.OS === "web" ? {} : iconAnimatedStyle]}
      >
        <Ionicons name={icon} size={44} color={colors.primary} />
      </Animated.View>
      <Text
        style={{ fontFamily: "Outfit_700Bold", fontSize: 18 }}
        className="text-text text-center mb-2"
      >
        {title}
      </Text>
      {subtitle && (
        <Text className="text-text-muted text-center mb-6 text-sm leading-relaxed">{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-lg"
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
