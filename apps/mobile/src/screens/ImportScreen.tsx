import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Switch, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useImportPolling } from "../hooks/useImportPolling";
import {
  uploadImport,
  getImportJobErrors,
  getTraktAuthUrl,
  getTraktStatus,
  syncTrakt,
  unlinkTrakt,
  toggleTraktAutoSync,
  ImportSource,
  TraktStatus,
} from "../services/import.service";
import { log } from "../utils/logger";
import { ImportProgressBar } from "../components/ImportProgressBar";
import { NetworkError } from "../components/NetworkError";
import { ScreenContainer } from "../components/ScreenContainer";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);
  const { data: job } = useImportPolling(jobId);

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
        setJobId(newJobId);
        showSnackbar(t("screens.import.started"), "success");
      } catch (err) {
        log("Import", "upload error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsUploading(false);
      }
    },
    [t, showSnackbar, getErrorMessage],
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
    Alert.alert(
      t("screens.import.traktUnlinkTitle"),
      t("screens.import.traktUnlinkMessage"),
      [
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
    );
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
    if (!jobId) return;
    log("Import", "view errors", { jobId });
    try {
      const { errors: jobErrors } = await getImportJobErrors(jobId);
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

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 bg-background">
        <Text className="text-2xl font-bold text-text mb-2">{t("screens.import.title")}</Text>
        <Text className="text-text-muted mb-6">{t("screens.import.description")}</Text>

        <Text className="text-text font-semibold text-lg mb-3">{t("screens.import.choosePlatform")}</Text>

        <PlatformCard
          icon="📺"
          name="TV Time"
          description={t("screens.import.tvtimeDesc")}
          onPress={() => pickAndUploadFile("tvtime", "application/zip")}
          disabled={isUploading || Boolean(jobId && !isComplete)}
        />

        <PlatformCard
          icon="🎬"
          name="Trakt"
          description={t("screens.import.traktDesc")}
          onPress={() => pickAndUploadFile("trakt", "application/json")}
          disabled={isUploading || Boolean(jobId && !isComplete)}
        />

        <PlatformCard
          icon="⭐"
          name="IMDb"
          description={t("screens.import.imdbDesc")}
          onPress={() => pickAndUploadFile("imdb", "text/csv")}
          disabled={isUploading || Boolean(jobId && !isComplete)}
        />

        <PlatformCard
          icon="🎞️"
          name="Letterboxd"
          description={t("screens.import.letterboxdDesc")}
          onPress={() => pickAndUploadFile("letterboxd", "text/csv")}
          disabled={isUploading || Boolean(jobId && !isComplete)}
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
      </ScrollView>
    </ScreenContainer>
  );
}
