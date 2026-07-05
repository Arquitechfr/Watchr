import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface NetworkErrorProps {
  isOffline?: boolean;
  message?: string;
  subtitle?: string;
  onRetry: () => void;
}

export function NetworkError({ isOffline, message, subtitle, onRetry }: NetworkErrorProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons
        name={isOffline ? "wifi-outline" : "alert-circle-outline"}
        size={48}
        color={colors.textMuted}
        className="mb-4"
      />
      <Text className="text-text text-lg font-semibold text-center mb-2">
        {message ?? (isOffline ? t("errors.offline") : t("errors.serverError"))}
      </Text>
      <Text className="text-text-muted text-center mb-6">
        {subtitle ??
          (isOffline
            ? t("errors.offlineSubtitle")
            : t("errors.serverErrorSubtitle"))}
      </Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-lg"
        onPress={onRetry}
      >
        <Text className="text-background font-semibold">{t("common.retry")}</Text>
      </TouchableOpacity>
    </View>
  );
}
