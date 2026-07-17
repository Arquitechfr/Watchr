import { View, Text, TouchableOpacity, Platform } from "react-native";
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { hapticSelection } from "../utils/haptics";

interface SegmentedControlOption {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

const PADDING = 4;

export function SegmentedControl({ options, active, onChange, className }: SegmentedControlProps) {
  const activeIndex = Math.max(0, options.findIndex((opt) => opt.key === active));
  const translateX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const segmentWidth = containerWidth > 0
    ? (containerWidth - PADDING * 2) / options.length
    : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(activeIndex * segmentWidth, {
        damping: 26,
        stiffness: 280,
        mass: 0.6,
      });
    }
  }, [activeIndex, segmentWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (Platform.OS === "web") {
    return (
      <View className={cn("flex-row bg-surface rounded-lg p-1 relative", className)}>
        {options.map((opt) => {
          const isActive = active === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => { hapticSelection(); onChange(opt.key); }}
              activeOpacity={0.8}
              className={cn(
                "flex-1 py-2 rounded-md items-center justify-center",
                isActive ? "bg-primary" : "bg-transparent",
              )}
            >
              <Text
                className={cn(
                  "font-semibold text-sm",
                  isActive ? "text-white" : "text-text-muted",
                )}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View
      className={cn("flex-row bg-surface rounded-lg p-1 relative", className)}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: PADDING,
            bottom: PADDING,
            left: PADDING,
            width: segmentWidth > 0 ? segmentWidth : `${100 / options.length}%`,
            borderRadius: 6,
          },
          indicatorStyle,
        ]}
        className="bg-primary"
      />
      {options.map((opt) => {
        const isActive = active === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => { hapticSelection(); onChange(opt.key); }}
            activeOpacity={0.8}
            className="flex-1 py-2 rounded-md items-center justify-center"
          >
            <Text
              className={cn(
                "font-semibold text-sm",
                isActive ? "text-white" : "text-text-muted",
              )}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
