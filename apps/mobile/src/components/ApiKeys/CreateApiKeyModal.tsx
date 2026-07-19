import { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useUIStore } from "../../store/uiStore";
import { useErrorMessage } from "../../services/api";
import { useCreateApiKeyMutation } from "../../hooks/useApiKeys";
import { copyToClipboard } from "../../utils/clipboard";
import type { ApiKeyScope, ApiKeyCreateResponse } from "../../services/apiKeys.service";

interface CreateApiKeyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateApiKeyModal({ visible, onClose }: CreateApiKeyModalProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;

  const createMutation = useCreateApiKeyMutation();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["read"]);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleScope(scope: ApiKeyScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      showSnackbar(t("screens.profile.apiKeyNameRequired"), "error");
      return;
    }
    if (scopes.length === 0) {
      showSnackbar(t("screens.profile.apiKeysScopesRequired"), "error");
      return;
    }
    createMutation.mutate(
      { name: trimmed, scopes },
      {
        onSuccess: (response) => {
          setCreatedKey(response);
          setName("");
          setScopes(["read"]);
        },
        onError: (err) => {
          const axiosErr = err as { response?: { data?: { error?: { code?: string } } } };
          if (axiosErr.response?.data?.error?.code === "API_KEY_LIMIT_REACHED") {
            showSnackbar(t("screens.profile.apiKeysLimitReached"), "error");
          } else {
            showSnackbar(getErrorMessage(err), "error");
          }
        },
      },
    );
  }

  async function handleCopy() {
    if (!createdKey) return;
    await copyToClipboard(createdKey.token);
    setCopied(true);
    showSnackbar(t("screens.profile.apiKeysCopied"), "success");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setCreatedKey(null);
    setCopied(false);
    setName("");
    setScopes(["read"]);
    onClose();
  }

  return (
    <Modal visible={visible} animationType={isDesktopWeb ? "fade" : "slide"} transparent onRequestClose={handleClose}>
      <View className={isDesktopWeb ? "flex-1 justify-center items-center bg-black/70 px-6" : "flex-1 justify-end bg-black/70"}>
        <View
          className={
            isDesktopWeb
              ? "bg-background rounded-2xl w-full max-w-md max-h-[85%] overflow-hidden"
              : "bg-background rounded-t-3xl max-h-[85%] flex-1 overflow-hidden"
          }
        >
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="w-9 h-9 items-center justify-center rounded-full bg-surface">
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <Text className="text-text font-bold text-base">{t("screens.profile.apiKeysCreate")}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView className="px-5 pt-5 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {createdKey ? (
              <View>
                <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.primary + "15", borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="warning-outline" size={20} color={colors.primary} />
                    <Text className="text-text font-semibold text-sm ml-2">{t("screens.profile.apiKeysTokenWarning")}</Text>
                  </View>
                  <Text className="text-text-muted text-xs">{t("screens.profile.apiKeysTokenWarningDescription")}</Text>
                </View>

                <Text className="text-text-muted text-xs mb-2 font-mono">{t("screens.profile.apiKeysTokenLabel")}</Text>
                <View className="rounded-lg p-3 mb-4" style={{ backgroundColor: colors.surface }}>
                  <Text className="text-text text-sm font-mono" selectable>{createdKey.token}</Text>
                </View>

                <TouchableOpacity
                  onPress={handleCopy}
                  className="rounded-lg py-3 items-center flex-row justify-center gap-2"
                  style={{ backgroundColor: colors.primary }}
                >
                  {copied ? (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text className="text-white font-semibold">{t("screens.profile.apiKeysCopied")}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="copy-outline" size={18} color="#fff" />
                      <Text className="text-white font-semibold">{t("screens.profile.apiKeysCopy")}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleClose} className="mt-3 py-3 items-center">
                  <Text className="text-text-muted">{t("common.close")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View className="mb-5">
                  <Text className="text-text-muted text-sm mb-2">{t("screens.profile.apiKeyName")}</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t("screens.profile.apiKeyNamePlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    maxLength={50}
                    className="text-text text-base border border-border rounded-lg p-3"
                    autoFocus
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-text-muted text-sm mb-3">{t("screens.profile.apiKeysScopes")}</Text>
                  <View className="flex-row gap-3">
                    {(["read", "write"] as ApiKeyScope[]).map((scope) => {
                      const isActive = scopes.includes(scope);
                      return (
                        <TouchableOpacity
                          key={scope}
                          onPress={() => toggleScope(scope)}
                          className="flex-row items-center rounded-lg px-4 py-3 flex-1"
                          style={{
                            backgroundColor: isActive ? colors.primary + "15" : colors.surface,
                            borderWidth: 1,
                            borderColor: isActive ? colors.primary : colors.border,
                          }}
                        >
                          <View
                            className="w-5 h-5 rounded items-center justify-center mr-2"
                            style={{ backgroundColor: isActive ? colors.primary : "transparent", borderWidth: 1, borderColor: isActive ? colors.primary : colors.border }}
                          >
                            {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <Text className="text-text text-sm font-medium">
                            {scope === "read" ? t("screens.profile.apiKeysScopeRead") : t("screens.profile.apiKeysScopeWrite")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                  className="rounded-lg py-3 items-center"
                  style={{ backgroundColor: createMutation.isPending ? colors.surface : colors.primary }}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text className="text-white font-semibold">{t("screens.profile.apiKeysCreate")}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleClose} className="mt-3 py-3 items-center">
                  <Text className="text-text-muted">{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
