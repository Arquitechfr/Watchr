import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useImportPolling } from "../hooks/useImportPolling";
import { uploadImport, getImportJobErrors } from "../services/import.service";
import { log } from "../utils/logger";
import { ImportProgressBar } from "../components/ImportProgressBar";
import { NetworkError } from "../components/NetworkError";
import { ScreenContainer } from "../components/ScreenContainer";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";

export function ImportScreen() {
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const [jobId, setJobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { data: job } = useImportPolling(jobId);

  async function pickFile() {
    log("Import", "pick file");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/zip",
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        log("Import", "file picker canceled");
        return;
      }
      const file = result.assets[0];
      log("Import", "file selected", { uri: file.uri, name: file.name });
      setIsUploading(true);
      setErrors([]);
      const { jobId: newJobId } = await uploadImport(file.uri);
      log("Import", "upload success", { jobId: newJobId });
      setJobId(newJobId);
      showSnackbar(t("screens.import.started"), "success");
    } catch (err) {
      log("Import", "upload error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function viewErrors() {
    if (!jobId) return;
    log("Import", "view errors", { jobId });
    try {
      const { errors: jobErrors } = await getImportJobErrors(jobId);
      log("Import", "errors loaded", { count: jobErrors.length });
      setErrors(jobErrors.map((err) => `Ligne ${err.line}: ${err.reason}`));
    } catch (err) {
      log("Import", "errors load failed", err);
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  const isComplete = job?.status === "completed" || job?.status === "failed";
  const isFailed = job?.status === "failed";

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 bg-background">
        <Text className="text-2xl font-bold text-text mb-4">{t("screens.import.title")}</Text>
        <Text className="text-text-muted mb-6">
          {t("screens.import.description")}
        </Text>

        <TouchableOpacity
          className="bg-primary py-4 rounded-lg items-center mb-6"
          onPress={pickFile}
          disabled={isUploading || Boolean(jobId && !isComplete)}
        >
          {isUploading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text className="text-background font-semibold text-base">{t("screens.import.pickFile")}</Text>
          )}
        </TouchableOpacity>

        {job && (
          <View className="bg-surface rounded-lg p-4 mb-4">
            <Text className="text-text font-semibold mb-2">
              {t("screens.import.status")}{" "}
              <Text className={isFailed ? "text-danger" : "text-primary"}>
                {job.status === "pending" && t("screens.import.pending")}
                {job.status === "processing" && t("screens.import.processing")}
                {job.status === "completed" && t("screens.import.completed")}
                {job.status === "failed" && t("screens.import.failed")}
              </Text>
            </Text>
            <ImportProgressBar progress={job.progress} />
            {isFailed && (
              <NetworkError
                isOffline={false}
                onRetry={() => {
                  setJobId(null);
                  setErrors([]);
                }}
              />
            )}
          </View>
        )}

        {isComplete && job.progress.failed > 0 && (
          <TouchableOpacity
            className="bg-surface-light py-3 rounded-lg items-center mb-4"
            onPress={viewErrors}
          >
            <Text className="text-text font-medium">{t("screens.import.viewErrors", { count: job.progress.failed })}</Text>
          </TouchableOpacity>
        )}

        {errors.length > 0 && (
          <View className="bg-surface rounded-lg p-4 mb-4">
            {errors.map((err, index) => (
              <Text key={index} className="text-danger text-sm mb-1">
                {err}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
