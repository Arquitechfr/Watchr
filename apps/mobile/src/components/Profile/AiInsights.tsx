import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import type { AiInsight } from "../../services/stats.service";

const INSIGHT_CONFIG: Record<
  AiInsight["type"],
  { icon: keyof typeof Ionicons.glyphMap; bgClass: string; textClass: string }
> = {
  positive: { icon: "trophy", bgClass: "bg-yellow-500/20", textClass: "text-yellow-500" },
  informational: { icon: "information-circle", bgClass: "bg-blue-500/20", textClass: "text-blue-500" },
  suggestion: { icon: "bulb", bgClass: "bg-primary/20", textClass: "text-primary" },
};

interface AiInsightsProps {
  insights: AiInsight[];
}

export function AiInsights({ insights }: AiInsightsProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  if (!insights || insights.length === 0) return null;

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-3">
        <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2">
          <Text className="text-primary text-[10px] font-bold">AI</Text>
        </View>
        <Text className="text-text font-semibold text-base">{t("screens.profile.aiInsightsTitle")}</Text>
      </View>
      <View className="gap-3">
        {insights.map((insight, index) => {
          const config = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.informational;
          return (
            <View
              key={`${insight.title}-${index}`}
              className="bg-surface rounded-lg p-4"
              style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}
            >
              <View className="flex-row items-center mb-2">
                <View className={`${config.bgClass} rounded-full w-7 h-7 items-center justify-center mr-2`}>
                  <Ionicons name={config.icon} size={14} color={colors.primary} />
                </View>
                <Text className="text-text font-semibold text-sm flex-1" numberOfLines={1}>
                  {insight.title}
                </Text>
              </View>
              <Text className="text-text-muted text-sm">{insight.message}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
