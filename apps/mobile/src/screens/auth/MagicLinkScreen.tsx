import { useEffect, useState } from "react";
import { Text, ActivityIndicator, Image, View, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { verifyMagicLink } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { log } from "../../utils/logger";
import { ScreenContainer } from "../../components/ScreenContainer";
import { syncPreferencesToBackend } from "../../hooks/useSyncPreferences";
import { prefetchSeriesData } from "../../utils/prefetch";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useI18n } from "../../i18n/useI18n";
import { Seo } from "../../components/Seo";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MagicLink">;

export function MagicLinkScreen({ route }: { route: { params: { token: string } } }) {
  const navigation = useNavigation<NavigationProp>();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const token = route.params?.token;
    if (!token) {
      log("MagicLink", "no token in params");
      setStatus("error");
      return;
    }

    (async () => {
      try {
        log("MagicLink", "verifying token");
        const tokens = await verifyMagicLink(token);
        log("MagicLink", "verify success");
        await setTokens(tokens.accessToken, tokens.refreshToken);
        syncPreferencesToBackend();
        prefetchSeriesData(queryClient);
        setStatus("success");
        showSnackbar(t("auth.magicLinkSuccess"), "success");
      } catch (err) {
        log("MagicLink", "verify error", err);
        setStatus("error");
        showSnackbar(t("auth.magicLinkFailed"), "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (status === "error") {
      const timeout = setTimeout(() => {
        navigation.navigate("Auth" as never);
      }, 2000);
      return () => clearTimeout(timeout);
    }
    if (status === "success") {
      if (Platform.OS === "web") {
        window.history.replaceState({}, "", window.location.origin);
      }
      const timeout = setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" as never }],
        });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [status, navigation]);

  return (
    <ScreenContainer className="px-6 justify-center items-center" fullWidth>
      <Seo title={t("seo.magicLink")} />
      <View style={Platform.OS === "web" ? { maxWidth: 400, width: "100%", alignItems: "center" } : { alignItems: "center" }}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require("../../../assets/splash-icon.webp")}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
        {status === "verifying" && (
          <>
            <ActivityIndicator size="large" className="mt-8" color="#C65D3A" />
            <Text className="text-text-muted text-center mt-4">
              {t("auth.magicLinkVerifying")}
            </Text>
          </>
        )}
        {status === "error" && (
          <Text className="text-text-muted text-center mt-8">
            {t("auth.magicLinkFailed")}
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}
