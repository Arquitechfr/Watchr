import { View, Image, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";

interface CoverBannerProps {
  url?: string;
  onPress?: () => void;
  isUploading?: boolean;
}

export function CoverBanner({ url, onPress, isUploading }: CoverBannerProps) {
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
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      ) : (
        <>
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
        </>
      )}

      {onPress && (
        <TouchableOpacity
          onPress={onPress}
          disabled={isUploading}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            bottom: 8,
            ...(Platform.OS === "web" ? { right: 8 } : { left: 8 }),
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Ionicons name="camera" size={18} color={colors.background} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
