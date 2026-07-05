import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";

interface AvatarProps {
  url?: string;
  size?: number;
}

export function Avatar({ url, size = 48 }: AvatarProps) {
  const colors = useThemeColors();
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceLight,
      }}
    >
      <Ionicons name="person" size={size * 0.5} color={colors.textMuted} />
    </View>
  );
}
