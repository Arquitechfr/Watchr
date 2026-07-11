import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useImportPolling } from "../hooks/useImportPolling";
import { useImportStore } from "../store/importStore";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

export function ImportProgressBanner() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const activeJobId = useImportStore((s) => s.activeJobId);
  const isBannerDismissed = useImportStore((s) => s.isBannerDismissed);
  const isBannerCollapsed = useImportStore((s) => s.isBannerCollapsed);
  const setBannerCollapsed = useImportStore((s) => s.setBannerCollapsed);
  const dismissBanner = useImportStore((s) => s.dismissBanner);

  const { data: job } = useImportPolling(activeJobId);

  if (!activeJobId || isBannerDismissed || !job) return null;

  const isComplete = job.status === "completed" || job.status === "failed";
  const isProcessing = job.status === "processing" || job.status === "pending";
  const percentage =
    job.progress.total > 0
      ? Math.round((job.progress.processed / job.progress.total) * 100)
      : 0;

  const statusColor = job.status === "failed" ? colors.danger : isComplete ? colors.primary : colors.textMuted;
  const statusText = job.status === "failed"
    ? t("screens.import.bannerFailed")
    : isComplete
      ? t("screens.import.bannerCompleted", { matched: job.progress.matched })
      : t("screens.import.bannerProcessing", {
          processed: job.progress.processed,
          total: job.progress.total,
        });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setBannerCollapsed(!isBannerCollapsed)}
      className="rounded-lg px-3 py-2 mb-3 flex-row items-center"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-1">
        {isBannerCollapsed ? (
          <View className="flex-row items-center">
            {isProcessing && <ActivityIndicator size="small" color={colors.primary} />}
            <Text className="text-text text-sm font-medium ml-2" numberOfLines={1}>
              {statusText}
            </Text>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center mb-1.5">
              {isProcessing && <ActivityIndicator size="small" color={colors.primary} />}
              <Text className="text-text text-sm font-medium ml-2" numberOfLines={1}>
                {statusText}
              </Text>
            </View>
            <View className="h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: colors.surfaceLight }}>
              <View
                className="h-full rounded-full"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: job.status === "failed" ? colors.danger : colors.primary,
                }}
              />
            </View>
            <Text className="text-text-muted text-xs">
              {job.progress.processed} / {job.progress.total} ({percentage}%) ·{" "}
              {job.progress.matched} {t("screens.import.imported")}, {job.progress.failed}{" "}
              {t("screens.import.failures")}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          setBannerCollapsed(!isBannerCollapsed);
        }}
        className="p-1.5 ml-2"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isBannerCollapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {isComplete && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            dismissBanner();
          }}
          className="p-1.5 ml-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
