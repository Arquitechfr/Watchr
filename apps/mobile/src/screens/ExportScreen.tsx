import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ScreenContainer";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";
import { downloadAndShareExport, ExportFormat, ExportOptions } from "../services/export.service";
import { Seo } from "../components/Seo";
import { SubScreenHeader } from "../components/SubScreenHeader";

interface ExportOptionProps {
  icon: string;
  label: string;
  description: string;
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
}

function ExportOption({ icon, label, description, badge, onPress, disabled }: ExportOptionProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      className="flex-row items-center rounded-lg p-4 mb-3"
      style={{ backgroundColor: colors.surface }}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text className="text-2xl mr-3">{icon}</Text>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-text font-semibold text-base">{label}</Text>
          {badge ? (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.primary + "20" }}>
              <Text className="text-xs font-medium" style={{ color: colors.primary }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-text-muted text-sm mt-0.5">{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function ExportScreen() {
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [includeRatings, setIncludeRatings] = useState(true);
  const [includeWatchlist, setIncludeWatchlist] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  async function handleExport(format: ExportFormat) {
    log("Export", "start", { format });
    setIsExporting(format);
    try {
      const options: ExportOptions = { includeRatings, includeWatchlist };
      await downloadAndShareExport(format, options);
      log("Export", "success", { format });
      showSnackbar(t("screens.export.success"), "success");
    } catch (err) {
      log("Export", "error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.export")} />
      <SubScreenHeader title={t("screens.export.title")} />
      <ScrollView className="md:max-w-lg md:mx-auto w-full" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <Text className="text-text-muted mb-6">{t("screens.export.description")}</Text>

        <ExportOption
          icon="📦"
          label={t("screens.export.watchrJson")}
          description={t("screens.export.watchrJsonDesc")}
          badge={t("screens.export.fullBackupBadge")}
          onPress={() => handleExport("json")}
          disabled={isExporting !== null}
        />

        <ExportOption
          icon="📄"
          label={t("screens.export.watchrCsv")}
          description={t("screens.export.watchrCsvDesc")}
          onPress={() => handleExport("csv")}
          disabled={isExporting !== null}
        />

        <ExportOption
          icon="🎬"
          label={t("screens.export.traktFormat")}
          description={t("screens.export.traktFormatDesc")}
          badge={t("screens.export.compatibleBadge")}
          onPress={() => handleExport("trakt")}
          disabled={isExporting !== null}
        />

        <ExportOption
          icon="⭐"
          label={t("screens.export.imdbFormat")}
          description={t("screens.export.imdbFormatDesc")}
          badge={t("screens.export.compatibleBadge")}
          onPress={() => handleExport("imdb")}
          disabled={isExporting !== null}
        />

        <ExportOption
          icon="🎞️"
          label={t("screens.export.letterboxdFormat")}
          description={t("screens.export.letterboxdFormatDesc")}
          badge={t("screens.export.moviesOnlyBadge")}
          onPress={() => handleExport("letterboxd")}
          disabled={isExporting !== null}
        />

        <View className="bg-surface rounded-lg p-4 mb-4 mt-2">
          <Text className="text-text font-semibold mb-3">{t("screens.export.options")}</Text>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text">{t("screens.export.includeRatings")}</Text>
            <Switch
              value={includeRatings}
              onValueChange={setIncludeRatings}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-text">{t("screens.export.includeWatchlist")}</Text>
            <Switch
              value={includeWatchlist}
              onValueChange={setIncludeWatchlist}
              trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            />
          </View>
        </View>

        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => setShowHelp((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showHelp ? "chevron-down" : "chevron-forward"}
            size={20}
            color={colors.text}
            style={{ marginRight: 8 }}
          />
          <Text className="text-text font-semibold text-lg">{t("screens.export.helpTitle")}</Text>
        </TouchableOpacity>
        {showHelp && (
          <View className="bg-surface rounded-lg p-4 mb-4">
            <Text className="text-text-muted text-sm mb-2">{t("screens.export.helpJson")}</Text>
            <Text className="text-text-muted text-sm mb-2">{t("screens.export.helpCsv")}</Text>
            <Text className="text-text-muted text-sm mb-2">{t("screens.export.helpTrakt")}</Text>
            <Text className="text-text-muted text-sm mb-2">{t("screens.export.helpImdb")}</Text>
            <Text className="text-text-muted text-sm">{t("screens.export.helpLetterboxd")}</Text>
          </View>
        )}

        {isExporting && (
          <View className="items-center py-4">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-text-muted mt-2">{t("screens.export.exporting")}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
