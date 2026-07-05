import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";
import { downloadAndShareExport, ExportFormat } from "../services/export.service";

interface ExportOptionProps {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

function ExportOption({ icon, label, description, onPress, disabled }: ExportOptionProps) {
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
        <Text className="text-text font-semibold text-base">{label}</Text>
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

  async function handleExport(format: ExportFormat) {
    log("Export", "start", { format });
    setIsExporting(format);
    try {
      await downloadAndShareExport(format);
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
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 bg-background">
        <Text className="text-2xl font-bold text-text mb-2">{t("screens.export.title")}</Text>
        <Text className="text-text-muted mb-6">{t("screens.export.description")}</Text>

        <ExportOption
          icon="📦"
          label={t("screens.export.watchrJson")}
          description={t("screens.export.watchrJsonDesc")}
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
          onPress={() => handleExport("trakt")}
          disabled={isExporting !== null}
        />

        <ExportOption
          icon="⭐"
          label={t("screens.export.imdbFormat")}
          description={t("screens.export.imdbFormatDesc")}
          onPress={() => handleExport("imdb")}
          disabled={isExporting !== null}
        />

        <ExportOption
          icon="🎞️"
          label={t("screens.export.letterboxdFormat")}
          description={t("screens.export.letterboxdFormatDesc")}
          onPress={() => handleExport("letterboxd")}
          disabled={isExporting !== null}
        />

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
