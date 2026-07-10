import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import type { ThreadSummary } from "../../services/comments.service";

interface ThreadSummaryCardProps {
  data: ThreadSummary | undefined;
  isLoading: boolean;
}

export function ThreadSummaryCard({ data, isLoading }: ThreadSummaryCardProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <View className="px-4 py-3 mb-2 flex-row items-center">
        <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2">
          <Text className="text-primary text-[10px] font-bold">AI</Text>
        </View>
        <Text className="text-text-muted text-sm mr-2">{t("screens.comments.aiSummaryLoading")}</Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!data || !data.summary || data.source === "fallback") return null;

  return (
    <View className="px-4 py-3 mb-2">
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        className="bg-surface rounded-lg p-3"
        style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}
      >
        <View className="flex-row items-center mb-1">
          <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2">
            <Text className="text-primary text-[10px] font-bold">AI</Text>
          </View>
          <Text className="text-text font-semibold text-sm flex-1">
            {t("screens.comments.aiSummary")}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
        </View>
        {expanded && (
          <Text className="text-text-muted text-sm mt-2">{data.summary}</Text>
        )}
        {!expanded && (
          <Text className="text-text-muted text-sm mt-1" numberOfLines={2}>
            {data.summary}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
