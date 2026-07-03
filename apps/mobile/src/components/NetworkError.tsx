import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface NetworkErrorProps {
  isOffline?: boolean;
  message?: string;
  subtitle?: string;
  onRetry: () => void;
}

export function NetworkError({ isOffline, message, subtitle, onRetry }: NetworkErrorProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons
        name={isOffline ? "wifi-outline" : "alert-circle-outline"}
        size={48}
        color={colors.textMuted}
        className="mb-4"
      />
      <Text className="text-text text-lg font-semibold text-center mb-2">
        {message ?? (isOffline ? "Pas de connexion" : "Oups, un problème est survenu")}
      </Text>
      <Text className="text-text-muted text-center mb-6">
        {subtitle ??
          (isOffline
            ? "Vérifie ta connexion internet et réessaie."
            : "Le serveur a rencontré une erreur. Réessaie dans un moment.")}
      </Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-lg"
        onPress={onRetry}
      >
        <Text className="text-background font-semibold">Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}
