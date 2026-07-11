import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { ConfettiBurst } from "./ConfettiBurst";
import { useThemeColors } from "../theme/useThemeColors";

interface CelebrationCheckmarkProps {
  onPress: () => void;
  isMarking?: boolean;
  size?: number;
  color?: string;
  buttonStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  activeOpacity?: number;
}

const SUCCESS_COLOR = "#4CAF50";

export function CelebrationCheckmark({
  onPress,
  isMarking,
  size = 28,
  color,
  buttonStyle,
  containerStyle,
  activeOpacity = 0.7,
}: CelebrationCheckmarkProps) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.primary;
  const scale = useSharedValue(1);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress(e: GestureResponderEvent) {
    e.stopPropagation();

    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1.3, { damping: 3, stiffness: 200 }),
      withTiming(1, { duration: 200 }),
    );

    setConfettiTrigger((prev) => prev + 1);
    setIsCelebrating(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsCelebrating(false), 600);

    onPress();
  }

  return (
    <View style={containerStyle}>
      {isMarking ? (
        <View style={[styles.markingContainer, buttonStyle]}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      ) : (
        <View style={styles.wrapper}>
          <Animated.View style={animatedStyle}>
            <TouchableOpacity
              onPress={handlePress}
              style={buttonStyle}
              activeOpacity={activeOpacity}
            >
              <Ionicons
                name={isCelebrating ? "checkmark-circle" : "checkmark-circle-outline"}
                size={size}
                color={isCelebrating ? SUCCESS_COLOR : iconColor}
              />
            </TouchableOpacity>
          </Animated.View>
          <ConfettiBurst trigger={confettiTrigger} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  markingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
