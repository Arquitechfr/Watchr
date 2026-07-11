import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { useI18n } from "../../i18n/useI18n";
import { useThemeStore, type ThemePreference } from "../../store/themeStore";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { updateThemePreference, type Me } from "../../services/auth.service";
import { useThemeColors } from "../../theme/useThemeColors";
import { useState } from "react";
import { Seo } from "../../components/Seo";

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
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.profileAppearance")} />
      <SubScreenHeader title={t("screens.profile.appearance")} />
      <View className="gap-3">
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => handleChange(opt.value)}
            className="flex-row items-center justify-between rounded-lg p-4"
            style={{ backgroundColor: colors.surface }}
            disabled={loading !== null}
          >
            <Ionicons name={opt.icon} size={20} color={colors.textMuted} />
            <Text className="text-text text-base flex-1 ml-3">{t(opt.labelKey)}</Text>
            {loading === opt.value ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : preference === opt.value ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </ScreenContainer>
  );
}
