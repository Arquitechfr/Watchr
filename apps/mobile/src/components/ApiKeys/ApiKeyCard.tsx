import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useRenameApiKeyMutation, useRevokeApiKeyMutation, useDeleteApiKeyMutation } from "../../hooks/useApiKeys";
import type { ApiKey, ApiKeyScope } from "../../services/apiKeys.service";

interface ApiKeyCardProps {
  apiKey: ApiKey;
}

export function ApiKeyCard({ apiKey }: ApiKeyCardProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar, showAlert } = useUIStore();
  const getErrorMessage = useErrorMessage();

  const renameMutation = useRenameApiKeyMutation();
  const revokeMutation = useRevokeApiKeyMutation();
  const deleteMutation = useDeleteApiKeyMutation();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(apiKey.name);

  const isRevoked = apiKey.revokedAt !== null;
  const locale = dateFnsLocale;

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      showSnackbar(t("screens.profile.apiKeyNameRequired"), "error");
      return;
    }
    renameMutation.mutate(
      { id: apiKey.id, name: trimmed },
      {
        onSuccess: () => {
          setIsRenaming(false);
          showSnackbar(t("screens.profile.apiKeysRenamed"), "success");
        },
        onError: (err) => showSnackbar(getErrorMessage(err), "error"),
      },
    );
  }

  function handleRevoke() {
    showAlert({
      title: t("screens.profile.apiKeysRevokeConfirmTitle"),
      message: t("screens.profile.apiKeysRevokeConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("screens.profile.apiKeysRevoke"),
          style: "destructive",
          onPress: () =>
            revokeMutation.mutate(apiKey.id, {
              onSuccess: () => showSnackbar(t("screens.profile.apiKeysRevokedSuccess"), "success"),
              onError: (err) => showSnackbar(getErrorMessage(err), "error"),
            }),
        },
      ],
    });
  }

  function handleDelete() {
    showAlert({
      title: t("screens.profile.apiKeysDeleteConfirmTitle"),
      message: t("screens.profile.apiKeysDeleteConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () =>
            deleteMutation.mutate(apiKey.id, {
              onSuccess: () => showSnackbar(t("screens.profile.apiKeysDeletedSuccess"), "success"),
              onError: (err) => showSnackbar(getErrorMessage(err), "error"),
            }),
        },
      ],
    });
  }

  const createdFormatted = apiKey.createdAt ? format(new Date(apiKey.createdAt), "d MMM yyyy", { locale }) : "";
  const lastUsedFormatted = apiKey.lastUsedAt ? format(new Date(apiKey.lastUsedAt), "d MMM yyyy 'at' HH:mm", { locale }) : "";

  return (
    <View className="rounded-xl p-4 mb-3" style={{ backgroundColor: colors.surface }}>
      <View className="flex-row items-center justify-between mb-2">
        {isRenaming ? (
          <View className="flex-row items-center flex-1 gap-2">
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              className="text-text text-base flex-1 border-b border-border pb-1"
              autoFocus
              maxLength={50}
            />
            <TouchableOpacity onPress={handleRenameSubmit} disabled={renameMutation.isPending}>
              {renameMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="checkmark" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setIsRenaming(false); setRenameValue(apiKey.name); }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center flex-1 gap-2">
            <Text className="text-text font-semibold text-base flex-1" numberOfLines={1}>{apiKey.name}</Text>
            {!isRevoked && (
              <TouchableOpacity onPress={() => { setRenameValue(apiKey.name); setIsRenaming(true); }} hitSlop={8}>
                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-text-muted text-xs font-mono">{apiKey.keyPrefix}…</Text>
        {isRevoked ? (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.danger + "20" }}>
            <Text className="text-xs font-medium" style={{ color: colors.danger }}>{t("screens.profile.apiKeysRevoked")}</Text>
          </View>
        ) : (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.primary + "20" }}>
            <Text className="text-xs font-medium" style={{ color: colors.primary }}>{t("screens.profile.apiKeysActive")}</Text>
          </View>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2 mb-2">
        {apiKey.scopes.map((scope: ApiKeyScope) => (
          <View
            key={scope}
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: scope === "write" ? colors.primary + "15" : colors.border + "30" }}
          >
            <Text className="text-xs font-medium" style={{ color: scope === "write" ? colors.primary : colors.textMuted }}>
              {scope === "read" ? t("screens.profile.apiKeysScopeRead") : t("screens.profile.apiKeysScopeWrite")}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-text-muted text-xs">
            {t("screens.profile.apiKeysCreated")}: {createdFormatted}
          </Text>
          <Text className="text-text-muted text-xs mt-0.5">
            {apiKey.lastUsedAt
              ? `${t("screens.profile.apiKeysLastUsed")}: ${lastUsedFormatted}`
              : t("screens.profile.apiKeysNeverUsed")}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        {!isRevoked && (
          <TouchableOpacity
            onPress={handleRevoke}
            disabled={revokeMutation.isPending}
            className="flex-row items-center"
          >
            {revokeMutation.isPending && revokeMutation.variables === apiKey.id ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="ban-outline" size={16} color={colors.danger} />
                <Text className="text-danger text-sm ml-1.5">{t("screens.profile.apiKeysRevoke")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
          className="flex-row items-center"
        >
          {deleteMutation.isPending && deleteMutation.variables === apiKey.id ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text className="text-danger text-sm ml-1.5">{t("common.delete")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
