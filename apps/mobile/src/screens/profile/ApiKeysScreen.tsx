import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { EmptyState } from "../../components/EmptyState";
import { ApiKeyCard } from "../../components/ApiKeys/ApiKeyCard";
import { CreateApiKeyModal } from "../../components/ApiKeys/CreateApiKeyModal";
import { VipBadge } from "../../components/VipBadge";
import { useApiKeysQuery } from "../../hooks/useApiKeys";
import type { ApiKey } from "../../services/apiKeys.service";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useErrorMessage } from "../../services/api";
import { getMe } from "../../services/auth.service";
import { getSubscriptionStatus } from "../../services/subscription.service";
import { remoteConfigService } from "../../services/remoteConfig";

type IconName = keyof typeof Ionicons.glyphMap;

const MAX_ACTIVE_KEYS = 10;

const TIPS: { icon: IconName; key: string }[] = [
  { icon: "lock-closed-outline", key: "screens.profile.apiKeysTipSecurity" },
  { icon: "speedometer-outline", key: "screens.profile.apiKeysTipRateLimit" },
  { icon: "key-outline", key: "screens.profile.apiKeysTipScopes" },
];

const DOC_LINKS: { icon: IconName; labelKey: string; url: string }[] = [
  { icon: "book-outline", labelKey: "screens.profile.apiKeysLinkDocs", url: "https://watchr.me/docs" },
  { icon: "key-outline", labelKey: "screens.profile.apiKeysLinkAuth", url: "https://watchr.me/docs#authentication" },
  { icon: "terminal-outline", labelKey: "screens.profile.apiKeysLinkMcp", url: "https://watchr.me/docs#mcp" },
  { icon: "server-outline", labelKey: "screens.profile.apiKeysLinkEndpoints", url: "https://watchr.me/docs#endpoints" },
];

export function ApiKeysScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const { data: apiKeys, isLoading, isError, error, refetch } = useApiKeysQuery();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: subStatus } = useQuery({ queryKey: ["subscriptionStatus"], queryFn: getSubscriptionStatus });
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const isVip = me?.subscriptionPlan === "vip";
  const mcpQuota = subStatus?.mcpQuota;
  const activeCount = apiKeys?.filter((k: ApiKey) => k.revokedAt === null).length ?? 0;
  const hasReachedLimit = activeCount >= MAX_ACTIVE_KEYS;

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.apiKeys")} />
      <SubScreenHeader title={t("screens.profile.apiKeys")} />
      <View className="flex-1 md:max-w-lg md:mx-auto w-full">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text className="text-text-muted text-sm mb-4">{t("screens.profile.apiKeysDescription")}</Text>

          {/* Plan & MCP Quota */}
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: isVip ? colors.primary : colors.border }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name={isVip ? "star" : "person-outline"} size={18} color={isVip ? colors.primary : colors.textMuted} />
                <Text className="text-text font-semibold text-sm ml-2">{t("screens.subscription.apiPlanLabel")}</Text>
              </View>
              {isVip ? (
                <VipBadge />
              ) : (
                <Text className="text-text-muted text-sm font-medium">{t("screens.subscription.apiPlanFree")}</Text>
              )}
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={16} color={colors.textMuted} />
                <Text className="text-text-muted text-xs ml-2">{t("screens.subscription.mcpQuotaTitle")}</Text>
              </View>
              <Text className="text-text text-xs font-medium">
                {isVip || mcpQuota?.remaining === Infinity
                  ? t("screens.subscription.mcpQuotaUnlimited")
                  : mcpQuota
                    ? t("screens.subscription.mcpQuotaRemaining", { remaining: mcpQuota.remaining, limit: mcpQuota.limit })
                    : "—"}
              </Text>
            </View>
            {!isVip && (
              <TouchableOpacity
                onPress={() => {
                  const webUrl = remoteConfigService.getConfig().web_app_url ?? "https://app.watchr.me";
                  Linking.openURL(`${webUrl}/profile/subscription`);
                }}
                className="mt-3 rounded-lg py-2 px-3 flex-row items-center justify-center"
                style={{ backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary + "40" }}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={14} color={colors.primary} />
                <Text className="text-primary text-xs font-semibold ml-1.5">{t("screens.subscription.mcpQuotaUpgrade")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Security tips */}
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary }}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text className="text-text font-semibold text-sm ml-2">{t("screens.profile.apiKeysTipsTitle")}</Text>
            </View>
            {TIPS.map((tip, index) => (
              <View
                key={tip.key}
                className="flex-row items-start mb-2.5"
                style={index === TIPS.length - 1 ? { marginBottom: 0 } : undefined}
              >
                <Ionicons name={tip.icon} size={16} color={colors.textMuted} />
                <Text className="text-text-muted text-xs flex-1 ml-2.5 leading-relaxed">{t(tip.key)}</Text>
              </View>
            ))}
          </View>

          {/* Quick start guide */}
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary }}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons name="terminal-outline" size={18} color={colors.primary} />
              <Text className="text-text font-semibold text-sm ml-2">{t("screens.profile.apiKeysQuickGuideTitle")}</Text>
            </View>
            <View className="flex-row items-start mb-2">
              <Text className="text-primary text-sm font-semibold mr-2">1.</Text>
              <Text className="text-text-muted text-xs flex-1 leading-relaxed">{t("screens.profile.apiKeysQuickGuideStep1")}</Text>
            </View>
            <View className="flex-row items-start mb-3">
              <Text className="text-primary text-sm font-semibold mr-2">2.</Text>
              <Text className="text-text-muted text-xs flex-1 leading-relaxed">{t("screens.profile.apiKeysQuickGuideStep2")}</Text>
            </View>
            <View className="rounded-lg p-3" style={{ backgroundColor: colors.background }}>
              <Text className="text-text text-xs font-mono" selectable>
                {t("screens.profile.apiKeysQuickGuideExample")}
              </Text>
            </View>
          </View>

          {/* Documentation links */}
          <Text className="text-text text-lg font-bold mb-3">{t("screens.profile.apiKeysLinksTitle")}</Text>
          <View className="rounded-xl mb-4" style={{ backgroundColor: colors.surface }}>
            {DOC_LINKS.map((link, index) => (
              <TouchableOpacity
                key={link.labelKey}
                onPress={() => Linking.openURL(link.url)}
                className="flex-row items-center px-4 py-3.5"
                style={index < DOC_LINKS.length - 1 ? {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                } : undefined}
                activeOpacity={0.7}
              >
                <Ionicons name={link.icon} size={20} color={colors.primary} />
                <Text className="text-text text-base flex-1 ml-3">{t(link.labelKey)}</Text>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Create button */}
          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            disabled={hasReachedLimit}
            className="rounded-lg py-3 px-4 flex-row items-center justify-center gap-2 mb-4"
            style={{ backgroundColor: hasReachedLimit ? colors.surface : colors.primary, opacity: hasReachedLimit ? 0.6 : 1 }}
          >
            <Ionicons name="add" size={20} color={hasReachedLimit ? colors.textMuted : "#fff"} />
            <Text className="font-semibold" style={{ color: hasReachedLimit ? colors.textMuted : "#fff" }}>
              {t("screens.profile.apiKeysCreate")}
            </Text>
          </TouchableOpacity>

          {hasReachedLimit && (
            <View className="rounded-lg p-3 mb-4" style={{ backgroundColor: colors.danger + "15" }}>
              <Text className="text-sm" style={{ color: colors.danger }}>{t("screens.profile.apiKeysLimitReached")}</Text>
            </View>
          )}

          {/* Keys list / states */}
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-text-muted mt-3">{t("common.loading")}</Text>
            </View>
          ) : isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={getErrorMessage(error)}
              actionLabel={t("common.retry")}
              onAction={() => refetch()}
            />
          ) : apiKeys && apiKeys.length > 0 ? (
            <View>
              {apiKeys.map((item: ApiKey) => (
                <ApiKeyCard key={item.id} apiKey={item} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="key-outline"
              title={t("screens.profile.apiKeysEmpty")}
              subtitle={t("screens.profile.apiKeysEmptyDescription")}
              actionLabel={t("screens.profile.apiKeysEmptyCta")}
              onAction={() => Linking.openURL("https://watchr.me/docs")}
            />
          )}
        </ScrollView>
      </View>

      <CreateApiKeyModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} />
    </ScreenContainer>
  );
}
