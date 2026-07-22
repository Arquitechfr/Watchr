import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { EmptyState } from "../../components/EmptyState";
import { ApiKeyCard } from "../../components/ApiKeys/ApiKeyCard";
import { CreateApiKeyModal } from "../../components/ApiKeys/CreateApiKeyModal";
import { useApiKeysQuery } from "../../hooks/useApiKeys";
import type { ApiKey } from "../../services/apiKeys.service";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useErrorMessage } from "../../services/api";

// Mirrors MAX_ACTIVE_KEYS in apps/backend/src/routes/account/apiKeys.ts.
// The backend remains the source of truth (400 API_KEY_LIMIT_REACHED already handled);
// this constant only disables the create button preemptively on the UI side.
const MAX_ACTIVE_KEYS = 10;

export function ApiKeysScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const { data: apiKeys, isLoading, isError, error, refetch } = useApiKeysQuery();
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const activeCount = apiKeys?.filter((k: ApiKey) => k.revokedAt === null).length ?? 0;
  const hasReachedLimit = activeCount >= MAX_ACTIVE_KEYS;

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.apiKeys")} />
      <SubScreenHeader title={t("screens.profile.apiKeys")} />
      <View className="flex-1 md:max-w-lg md:mx-auto w-full">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-text-muted text-sm">{t("screens.profile.apiKeysDescription")}</Text>
        </View>

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
          <FlatList
            data={apiKeys}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ApiKeyCard apiKey={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          />
        ) : (
          <EmptyState
            icon="key-outline"
            title={t("screens.profile.apiKeysEmpty")}
            subtitle={t("screens.profile.apiKeysEmptyDescription")}
          />
        )}
      </View>

      <CreateApiKeyModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} />
    </ScreenContainer>
  );
}
