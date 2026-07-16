import { View } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";

export function CoverBanner() {
  const colors = useThemeColors();

  return (
    <View
      style={{
        height: 120,
        backgroundColor: colors.primary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: colors.primaryDark,
          opacity: 0.5,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -50,
          left: -20,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: colors.surfaceLight,
          opacity: 0.15,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background,
          opacity: 0.1,
        }}
      />
    </View>
  );
}
