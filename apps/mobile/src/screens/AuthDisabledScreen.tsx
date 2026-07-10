import { View, Text, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { Seo } from "../components/Seo";

export function AuthDisabledScreen() {
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
      <Seo title={t("seo.authDisabled")} />
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
            fontSize: 28,
            color: colors.primary,
            marginTop: 12,
          }}
        >
          {t("common.appName")}
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
          {t("authDisabled.message")}
        </Text>
      </View>
    </View>
  );
}
