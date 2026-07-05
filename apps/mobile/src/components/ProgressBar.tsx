import { View } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";

interface ProgressBarProps {
  watched: number;
  total: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ watched, total, color, height = 4 }: ProgressBarProps) {
  const colors = useThemeColors();

  if (total === 0) return null;

  const ratio = Math.min(watched / total, 1);
  const barColor = color ?? colors.primary;

  return (
    <View
      style={{
        height,
        backgroundColor: colors.surfaceLight,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: watched }}
    >
      <View
        style={{
          height: "100%",
          width: `${ratio * 100}%`,
          backgroundColor: barColor,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
