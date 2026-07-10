import { View, Text, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";

export function MaintenanceScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={
          Platform.OS === "web"
            ? { maxWidth: 400, width: "100%", alignItems: "center", paddingHorizontal: 24 }
            : { alignItems: "center", paddingHorizontal: 24 }
        }
      >
        <Image
          source={require("../../assets/splash-icon.png")}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: "Outfit_700Bold",
            fontSize: 32,
            color: colors.primary,
            marginTop: 12,
          }}
        >
          {t("maintenance.title")}
        </Text>
        <Text
          style={{
            fontFamily: "Outfit_400Regular",
            fontSize: 16,
            color: colors.textMuted,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 24,
          }}
        >
          {t("maintenance.message")}
        </Text>
      </View>
    </View>
  );
}
