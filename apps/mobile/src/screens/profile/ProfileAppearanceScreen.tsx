import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { useThemeStore, type ThemePreference } from "../../store/themeStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { updateThemePreference, type Me } from "../../services/auth.service";
import { useThemeColors } from "../../theme/useThemeColors";
import { useState } from "react";

const OPTIONS: { value: ThemePreference; labelKey: string; icon: "phone-portrait" | "sunny" | "moon" }[] = [
  { value: "system", labelKey: "screens.profile.appearanceSystem", icon: "phone-portrait" },
  { value: "light", labelKey: "screens.profile.appearanceLight", icon: "sunny" },
  { value: "dark", labelKey: "screens.profile.appearanceDark", icon: "moon" },
];

export function ProfileAppearanceScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const preference = useThemeStore((s) => s.themePreference);
  const setPreference = useThemeStore((s) => s.setThemePreference);
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<ThemePreference | null>(null);

  async function handleChange(pref: ThemePreference) {
    if (pref === preference) return;
    setLoading(pref);
    try {
      await updateThemePreference(pref);
      setPreference(pref);
      queryClient.setQueryData<Me>(["me"], (old: Me | undefined) => (old ? { ...old, themePreference: pref } : old));
    } catch (error) {
      showSnackbar(getErrorMessage(error), "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <View style={Platform.OS === "web" ? { maxWidth: 600, alignSelf: "center", width: "100%" } : undefined}>
      <Text className="text-text-muted text-center mb-6">{t("screens.profile.appearance")}</Text>
      <View className="gap-3">
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => handleChange(opt.value)}
            className="flex-row items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: colors.surface }}
            disabled={loading !== null}
          >
            <Text className="text-text text-base">{t(opt.labelKey)}</Text>
            {loading === opt.value ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : preference === opt.value ? (
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 24, height: 24, backgroundColor: colors.primary }}
              >
                <Text className="text-background font-bold text-xs">✓</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
      </View>
    </ScreenContainer>
  );
}
