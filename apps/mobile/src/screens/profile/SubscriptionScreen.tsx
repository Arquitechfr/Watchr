import { View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Modal, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { getMe } from "../../services/auth.service";
import { startSubscription, cancelSubscription } from "../../services/subscription.service";
import { fetchVipFeatures, type VipFeature } from "../../services/vipFeatures.service";
import { remoteConfigService } from "../../services/remoteConfig";
import { useState } from "react";

const FALLBACK_FEATURES = [
  { icon: "remove-circle-outline" as const, key: "screens.subscription.featureNoAds" },
  { icon: "bar-chart-outline" as const, key: "screens.subscription.featureAdvancedStats" },
  { icon: "infinite-outline" as const, key: "screens.subscription.featureUnlimitedTracking" },
  { icon: "sparkles-outline" as const, key: "screens.subscription.featureAiInsights" },
];

function getWebAppUrl(): string {
  return remoteConfigService.getConfig().web_app_url ?? "https://app.watchr.me";
}

export function SubscriptionScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const isVip = me?.subscriptionPlan === "vip";
  const isNative = Platform.OS !== "web";

  const { data: dynamicFeatures } = useQuery({
    queryKey: ["vip-features"],
    queryFn: fetchVipFeatures,
    staleTime: 5 * 60 * 1000,
  });

  const features: Array<{ icon: string; label: string; description?: string }> = (dynamicFeatures && dynamicFeatures.length > 0)
    ? dynamicFeatures.map((f: VipFeature) => ({
        icon: f.icon,
        label: f.translations[locale] ?? f.translations.en ?? f.labelKey,
        description: f.descriptionTranslations[locale] ?? f.descriptionTranslations.en ?? undefined,
      }))
    : FALLBACK_FEATURES.map((f) => ({ icon: f.icon, label: t(f.key) }));

  const startMutation = useMutation({
    mutationFn: startSubscription,
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  function handleUpgrade() {
    if (isNative) {
      Linking.openURL(`${getWebAppUrl()}/profile/subscription`);
    } else {
      startMutation.mutate();
    }
  }

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setShowCancelConfirm(false);
      showSnackbar(t("screens.subscription.cancelled"), "success");
    },
    onError: (error) => {
      showSnackbar(getErrorMessage(error), "error");
    },
  });

  function handleCancel() {
    if (Platform.OS === "web") {
      setShowCancelConfirm(true);
    } else {
      Alert.alert(
        t("screens.subscription.cancelCta"),
        t("screens.subscription.cancelConfirm"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("common.confirm"), style: "destructive", onPress: () => cancelMutation.mutate() },
        ],
      );
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("screens.subscription.title")} />
      <SubScreenHeader title={t("screens.subscription.title")} />
      <ScrollView className="md:max-w-lg md:mx-auto w-full" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        {isVip ? (
          <View className="items-center mb-6 mt-4">
            <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: colors.primary }}>
              <Ionicons name="star" size={32} color={colors.background} />
            </View>
            <Text className="text-text text-xl font-bold">{t("screens.subscription.active")}</Text>
            <Text className="text-text-muted text-sm mt-1">{t("screens.subscription.activeMessage")}</Text>
          </View>
        ) : (
          <View className="items-center mb-6 mt-4">
            <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: colors.primary + "20" }}>
              <Ionicons name="star-outline" size={32} color={colors.primary} />
            </View>
            <Text className="text-text text-xl font-bold">Watchr VIP</Text>
            <Text className="text-primary text-2xl font-bold mt-2">{t("screens.subscription.monthlyPrice")}</Text>
          </View>
        )}

        <View className="gap-3 mb-8">
          {features.map((feature, index) => (
            <View key={`feature-${index}`} className="flex-row items-center rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
              <Ionicons name={feature.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-text text-base">{feature.label}</Text>
                {feature.description ? (
                  <Text className="text-text-muted text-sm mt-0.5">{feature.description}</Text>
                ) : null}
              </View>
              {!isVip && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </View>
          ))}
        </View>

        {!isVip ? (
          <View>
            <TouchableOpacity
              onPress={handleUpgrade}
              disabled={startMutation.isPending}
              className="rounded-lg p-4 items-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.7}
            >
              {startMutation.isPending ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text className="text-background font-bold text-base">{t("screens.subscription.upgradeCta")}</Text>
              )}
            </TouchableOpacity>
            {isNative && (
              <Text className="text-text-muted text-xs text-center mt-3">
                {t("screens.subscription.nativeRedirectNotice")}
              </Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            className="rounded-lg p-4 items-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger }}
            activeOpacity={0.7}
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <Text style={{ color: colors.danger }} className="font-semibold text-base">
                {t("screens.subscription.cancelCta")}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showCancelConfirm} transparent animationType="fade" onRequestClose={() => !cancelMutation.isPending && setShowCancelConfirm(false)}>
        <TouchableOpacity className="flex-1 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => !cancelMutation.isPending && setShowCancelConfirm(false)} activeOpacity={1}>
          <View className="rounded-xl p-6" style={{ backgroundColor: colors.surface, width: "80%", maxWidth: 320 }}>
            <Text className="text-text text-lg font-bold text-center mb-2">{t("screens.subscription.cancelCta")}</Text>
            <Text className="text-text-muted text-base text-center mb-6">{t("screens.subscription.cancelConfirm")}</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.border }}
                onPress={() => setShowCancelConfirm(false)}
                disabled={cancelMutation.isPending}
                activeOpacity={0.7}
              >
                <Text className="text-text font-semibold">{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.danger }}
                onPress={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                activeOpacity={0.7}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-semibold" style={{ color: "#fff" }}>{t("common.confirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
