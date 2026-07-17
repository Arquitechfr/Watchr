import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

type NetworkErrorVariant = "network" | "server" | "session";

interface NetworkErrorProps {
  isOffline?: boolean;
  variant?: NetworkErrorVariant;
  message?: string;
  subtitle?: string;
  onRetry: () => void;
}

export function NetworkError({ isOffline, variant, message, subtitle, onRetry }: NetworkErrorProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const resolvedVariant: NetworkErrorVariant = variant ?? (isOffline ? "network" : "server");

  const config = {
    network: {
      icon: "wifi-outline" as const,
      title: message ?? t("errors.offline"),
      sub: subtitle ?? t("errors.offlineSubtitle"),
      button: t("common.retry"),
    },
    server: {
      icon: "alert-circle-outline" as const,
      title: message ?? t("errors.serverError"),
      sub: subtitle ?? t("errors.serverErrorSubtitle"),
      button: t("common.retry"),
    },
    session: {
      icon: "lock-closed-outline" as const,
      title: message ?? t("errors.sessionExpired"),
      sub: subtitle ?? t("errors.sessionExpiredSubtitle"),
      button: t("common.reconnect"),
    },
  };

  const { icon, title, sub, button } = config[resolvedVariant];

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons
        name={icon}
        size={48}
        color={colors.textMuted}
        className="mb-4"
      />
      <Text className="text-text text-lg font-semibold text-center mb-2">
        {title}
      </Text>
      <Text className="text-text-muted text-center mb-6">
        {sub}
      </Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-lg"
        onPress={onRetry}
      >
        <Text className="text-background font-semibold">{button}</Text>
      </TouchableOpacity>
    </View>
  );
}
