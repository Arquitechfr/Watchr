import { View, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useThemeColors } from "../../theme/useThemeColors";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEFAULT_BANNER = require("../../../assets/banner_default.webp");

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
      <Image
        source={url ? { uri: url } : DEFAULT_BANNER}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      />

      {onPress && (
        <>
          <TouchableOpacity
            onPress={onPress}
            disabled={isUploading}
            activeOpacity={0.8}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
          />
          {isUploading && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
              }}
            >
              <ActivityIndicator size="small" color={colors.background} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
