import { useState, useEffect, useRef } from "react";
import { Text, TextInput, TouchableOpacity, ActivityIndicator, Image, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { requestEmailCode, verifyEmailCode } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { log } from "../../utils/logger";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScreenContainer } from "../../components/ScreenContainer";
import { AuthSettingsMenu } from "../../components/AuthSettingsMenu";
import { syncPreferencesToBackend } from "../../hooks/useSyncPreferences";
import { prefetchSeriesData } from "../../utils/prefetch";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { useI18n } from "../../i18n/useI18n";
import { useRemoteConfig } from "../../hooks/useRemoteConfig";
import { Seo } from "../../components/Seo";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "EmailCode">;

const RESEND_COOLDOWN_SECONDS = 30;

export function EmailCodeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { setTokens } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const config = useRemoteConfig();
  const queryClient = useQueryClient();
  const authDisabled = !config.auth_enabled;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!email.trim() || !email.includes("@")) {
      showSnackbar(t("auth.invalidEmail"), "error");
      return;
    }
    setIsLoading(true);
    try {
      log("EmailCode", "requesting code", { email: email.trim() });
      await requestEmailCode(email.trim());
      log("EmailCode", "code sent");
      setStep("code");
      startCooldown();
      showSnackbar(t("auth.emailCodeSent"), "success");
    } catch (err) {
      log("EmailCode", "request error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6) {
      showSnackbar(t("auth.emailCodeInvalid"), "error");
      return;
    }
    setIsLoading(true);
    try {
      log("EmailCode", "verifying code");
      const tokens = await verifyEmailCode(email.trim(), code);
      log("EmailCode", "verify success");
      await setTokens(tokens.accessToken, tokens.refreshToken);
      syncPreferencesToBackend();
      prefetchSeriesData(queryClient);
      showSnackbar(t("auth.connected"), "success");
    } catch (err) {
      log("EmailCode", "verify error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      await requestEmailCode(email.trim());
      startCooldown();
      showSnackbar(t("auth.emailCodeSent"), "success");
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenContainer className="px-6 justify-center" fullWidth>
      <Seo title={t("seo.emailCode")} />
      <View style={Platform.OS === "web" ? { maxWidth: 400, width: "100%", alignSelf: "center" } : undefined}>
        <View style={{ top: insets.top + 8, zIndex: 50 }} className="absolute right-4">
          <AuthSettingsMenu />
        </View>

        <View className="items-center mb-10">
          <Image
            source={require("../../../assets/splash-icon.webp")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
          <Text
            style={{ fontFamily: "Outfit_700Bold", fontSize: 32 }}
            className="text-primary mt-2"
          >
            {t("common.appName")}
          </Text>
        </View>

        {step === "email" ? (
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(200)} exiting={FadeOut.duration(200)}>
            <Text className="text-text-muted text-center mb-6">
              {t("auth.emailCodeEnter")}
            </Text>
            <TextInput
              className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border"
              placeholder={t("auth.email")}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              className="bg-primary py-3 rounded-lg items-center mb-4"
              onPress={handleSendCode}
              disabled={isLoading || authDisabled}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold text-base">{t("auth.emailCodeSend")}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(200)} exiting={FadeOut.duration(200)}>
            <Text className="text-text-muted text-center mb-6">
              {t("auth.emailCodeEnter")}
            </Text>
            <TextInput
              className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border text-center"
              placeholder="------"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              style={{ fontSize: 24, letterSpacing: 8, fontFamily: "Outfit_700Bold" }}
            />
            <TouchableOpacity
              className="bg-primary py-3 rounded-lg items-center mb-4"
              onPress={handleVerifyCode}
              disabled={isLoading || authDisabled}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold text-base">{t("auth.emailCodeVerify")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0 || isLoading}
              className="mt-2"
            >
              <Text className="text-text-muted text-center text-sm">
                {cooldown > 0
                  ? t("auth.emailCodeResendIn", { seconds: cooldown })
                  : t("auth.emailCodeResend")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {authDisabled && (
          <Text className="text-text-muted text-center text-sm mb-4">
            {t("authDisabled.message")}
          </Text>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Login")} className="mt-4">
          <Text className="text-primary text-center">{t("auth.backToLogin")}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
