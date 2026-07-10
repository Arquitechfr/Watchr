import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { useImportPolling } from "../hooks/useImportPolling";
import {
  uploadImport,
  getImportJobErrors,
  getImportJobs,
  getTraktAuthUrl,
  getTraktStatus,
  syncTrakt,
  unlinkTrakt,
  toggleTraktAutoSync,
  ImportSource,
  TraktStatus,
  ImportJobSummary,
} from "../services/import.service";
import { log } from "../utils/logger";
import { ImportProgressBar } from "../components/ImportProgressBar";
import { NetworkError } from "../components/NetworkError";
import { ScreenContainer } from "../components/ScreenContainer";
import { useUIStore } from "../store/uiStore";
import { useImportStore } from "../store/importStore";
import { useErrorMessage } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Seo } from "../components/Seo";

const SOURCE_ICONS: Record<string, string> = {
  tvtime: "📺",
  trakt: "🎬",
  imdb: "⭐",
  letterboxd: "🎞️",
  watchr: "📋",
  unknown: "📦",
};

interface PlatformCardProps {
  icon: string;
  name: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

function PlatformCard({ icon, name, description, onPress, disabled }: PlatformCardProps) {
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
        <Text className="text-text font-semibold text-base">{name}</Text>
        <Text className="text-text-muted text-sm mt-0.5">{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function ImportScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const { showSnackbar, showAlert } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const activeJobId = useImportStore((state) => state.activeJobId);
  const setActiveJobId = useImportStore((state) => state.setActiveJobId);
  const clearActiveJob = useImportStore((state) => state.clearActiveJob);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);
  const { data: job } = useImportPolling(activeJobId);

  const { data: importJobsData } = useQuery({
    queryKey: ["import-jobs"],
    queryFn: getImportJobs,
  });

  const { data: traktStatus } = useQuery<TraktStatus>({
    queryKey: ["trakt-status"],
    queryFn: getTraktStatus,
  });

  const pickAndUploadFile = useCallback(
    async (source: ImportSource, mimeType: string) => {
      log("Import", "pick file", { source });
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: mimeType });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          log("Import", "file picker canceled");
          return;
        }
        const file = result.assets[0];
        log("Import", "file selected", { uri: file.uri, name: file.name });
        setIsUploading(true);
        setErrors([]);
        const { jobId: newJobId } = await uploadImport(file.uri, source);
        log("Import", "upload success", { jobId: newJobId });
        setActiveJobId(newJobId);
        queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
        showSnackbar(t("screens.import.started"), "success");
      } catch (err) {
        log("Import", "upload error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsUploading(false);
      }
    },
    [t, showSnackbar, getErrorMessage, setActiveJobId, queryClient],
  );

  async function handleTraktOAuth() {
    try {
      const url = await getTraktAuthUrl();
      log("Import", "trakt auth url", { url });
      await Linking.openURL(url);
    } catch (err) {
      log("Import", "trakt auth error", err);
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  async function handleTraktSync() {
    setIsSyncingTrakt(true);
    try {
      const result = await syncTrakt();
      log("Import", "trakt sync result", result);
      showSnackbar(t("screens.import.traktSyncStarted"), "success");
      queryClient.invalidateQueries({ queryKey: ["trakt-status"] });
    } catch (err) {
      log("Import", "trakt sync error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      setIsSyncingTrakt(false);
    }
  }

  async function handleTraktUnlink() {
    showAlert({
      title: t("screens.import.traktUnlinkTitle"),
      message: t("screens.import.traktUnlinkMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkTrakt();
              queryClient.invalidateQueries({ queryKey: ["trakt-status"] });
              showSnackbar(t("screens.import.traktUnlinked"), "success");
            } catch (err) {
              showSnackbar(getErrorMessage(err), "error");
            }
          },
        },
      ],
    });
  }

  async function handleToggleAutoSync(enabled: boolean) {
    try {
      await toggleTraktAutoSync(enabled);
      queryClient.invalidateQueries({ queryKey: ["trakt-status"] });
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  async function viewErrors() {
    if (!activeJobId) return;
    log("Import", "view errors", { jobId: activeJobId });
    try {
      const { errors: jobErrors } = await getImportJobErrors(activeJobId);
      log("Import", "errors loaded", { count: jobErrors.length });
      setErrors(jobErrors.map((err) => `${t("screens.import.line")} ${err.line}: ${err.reason}`));
    } catch (err) {
      log("Import", "errors load failed", err);
      showSnackbar(getErrorMessage(err), "error");
    }
  }

  const isComplete = job?.status === "completed" || job?.status === "failed";
  const isFailed = job?.status === "failed";
  const isTraktLinked = traktStatus?.linked === true;
  const recentJobs = (importJobsData?.jobs ?? []).filter((j: ImportJobSummary) => j.id !== activeJobId);
  const { dateFnsLocale } = useI18n();

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.import")} />
      <ScrollView className="flex-1 bg-background">
        <Text className="text-2xl font-bold text-text mb-2">{t("screens.import.title")}</Text>
        <Text className="text-text-muted mb-6">{t("screens.import.description")}</Text>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text font-semibold text-lg">{t("screens.import.choosePlatform")}</Text>
          <TouchableOpacity onPress={() => setShowDisclaimer((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        {showDisclaimer && (
          <Text className="text-text-muted text-xs mb-3">{t("screens.import.importDisclaimer")}</Text>
        )}

        <PlatformCard
          icon="📺"
          name="TV Time"
          description={t("screens.import.tvtimeDesc")}
          onPress={() => pickAndUploadFile("tvtime", "application/zip")}
          disabled={isUploading || Boolean(activeJobId && !isComplete)}
        />

        <PlatformCard
          icon="🎬"
          name="Trakt"
          description={t("screens.import.traktDesc")}
          onPress={() => pickAndUploadFile("trakt", "application/json")}
          disabled={isUploading || Boolean(activeJobId && !isComplete)}
        />

        <PlatformCard
          icon="⭐"
          name="IMDb"
          description={t("screens.import.imdbDesc")}
          onPress={() => pickAndUploadFile("imdb", "text/csv")}
          disabled={isUploading || Boolean(activeJobId && !isComplete)}
        />

        <PlatformCard
          icon="🎞️"
          name="Letterboxd"
          description={t("screens.import.letterboxdDesc")}
          onPress={() => pickAndUploadFile("letterboxd", "text/csv")}
          disabled={isUploading || Boolean(activeJobId && !isComplete)}
        />

        {isTraktLinked && (
          <View className="bg-surface rounded-lg p-4 mb-4 mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-text font-semibold">{t("screens.import.traktConnected")}</Text>
                <Text className="text-text-muted text-sm">{traktStatus?.traktUsername}</Text>
              </View>
              <TouchableOpacity onPress={handleTraktUnlink}>
                <Text className="text-danger text-sm">{t("screens.import.unlink")}</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text">{t("screens.import.autoSync")}</Text>
              <Switch
                value={traktStatus?.autoSync ?? false}
                onValueChange={handleToggleAutoSync}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
              />
            </View>

            <TouchableOpacity
              className="bg-primary py-3 rounded-lg items-center"
              onPress={handleTraktSync}
              disabled={isSyncingTrakt}
            >
              {isSyncingTrakt ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold">{t("screens.import.syncNow")}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isTraktLinked && (
          <TouchableOpacity
            className="bg-surface py-3 rounded-lg items-center mb-4 mt-2"
            onPress={handleTraktOAuth}
          >
            <Text className="text-primary font-semibold">{t("screens.import.connectTrakt")}</Text>
          </TouchableOpacity>
        )}

        {isUploading && (
          <View className="items-center py-4">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-text-muted mt-2">{t("screens.import.uploading")}</Text>
          </View>
        )}

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
                  clearActiveJob();
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

        {isComplete && job.progress.pendingReview && job.progress.pendingReview > 0 && (
          <TouchableOpacity
            className="bg-primary py-4 rounded-lg items-center mb-4"
            onPress={() => navigation.navigate("ImportReview", { jobId: job.id })}
          >
            <Text className="text-background font-semibold">
              {t("screens.import.reviewPending", { count: job.progress.pendingReview })}
            </Text>
          </TouchableOpacity>
        )}

        {recentJobs.length > 0 && (
          <View className="mb-4">
            <Text className="text-text font-semibold text-lg mb-3">{t("screens.import.recentImports")}</Text>
            {recentJobs.map((item: ImportJobSummary) => (
              <ImportHistoryRow key={item.id} job={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

interface ImportHistoryRowProps {
  job: ImportJobSummary;
}

function ImportHistoryRow({ job }: ImportHistoryRowProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const { t, dateFnsLocale } = useI18n();
  const icon = SOURCE_ICONS[job.source ?? "unknown"] ?? "📦";
  const dateStr = format(new Date(job.createdAt), "PP", { locale: dateFnsLocale });
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const hasPendingReview = isCompleted && (job.progress.pendingReview ?? 0) > 0;

  const statusColor = isFailed ? colors.danger : isCompleted ? colors.primary : colors.textMuted;

  return (
    <TouchableOpacity
      className="flex-row items-center rounded-lg p-3 mb-2"
      style={{ backgroundColor: colors.surface }}
      onPress={() => hasPendingReview && navigation.navigate("ImportReview", { jobId: job.id })}
      disabled={!hasPendingReview}
      activeOpacity={0.7}
    >
      <Text className="text-xl mr-3">{icon}</Text>
      <View className="flex-1">
        <Text className="text-text font-medium text-sm">
          {job.source ?? "unknown"}
        </Text>
        <Text className="text-text-muted text-xs mt-0.5">{dateStr}</Text>
      </View>
      <Text style={{ color: statusColor }} className="text-sm font-medium">
        {job.status === "pending" && t("screens.import.pending")}
        {job.status === "processing" && t("screens.import.processing")}
        {job.status === "completed" && t("screens.import.completed")}
        {job.status === "failed" && t("screens.import.failed")}
      </Text>
    </TouchableOpacity>
  );
}
