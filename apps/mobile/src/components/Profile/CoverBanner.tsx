import { View, Image, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";

interface CoverBannerProps {
  url?: string;
  onPress?: () => void;
  isUploading?: boolean;
}

export function CoverBanner({ url, onPress, isUploading }: CoverBannerProps) {
  const colors = useThemeColors();
  const { t } = useI18n();

  return (
    <View
      style={{
        height: 120,
        backgroundColor: colors.surface,
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[colors.surfaceLight, colors.surface, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

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
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
            >
              <Ionicons name="camera" size={16} color="#F5F0EB" />
              <Text style={{ color: "#F5F0EB", fontSize: 13, fontWeight: "500" }}>
                {t("screens.profile.changeBanner")}
              </Text>
            </View>
          </TouchableOpacity>
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
