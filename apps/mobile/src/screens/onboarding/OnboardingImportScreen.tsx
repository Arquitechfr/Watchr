import { useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useUIStore } from "../../store/uiStore";
import { useImportStore } from "../../store/importStore";
import { useCompleteOnboarding } from "../../hooks/useOnboarding";
import { useErrorMessage } from "../../services/api";
import { uploadImport, ImportSource } from "../../services/import.service";
import { log } from "../../utils/logger";

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

interface OnboardingImportScreenProps {
  onComplete: () => void;
}

export function OnboardingImportScreen({ onComplete }: OnboardingImportScreenProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const getErrorMessage = useErrorMessage();
  const setActiveJobId = useImportStore((s) => s.setActiveJobId);
  const completeOnboardingMutation = useCompleteOnboarding();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSourceRef = useRef<ImportSource>("tvtime");

  const handleCompleteOnboarding = useCallback(() => {
    completeOnboardingMutation.mutate(undefined, {
      onSuccess: () => {
        onComplete();
      },
      onError: () => {
        onComplete();
      },
    });
  }, [completeOnboardingMutation, onComplete]);

  const pickAndUploadFile = useCallback(
    async (source: ImportSource, mimeType: string) => {
      log("OnboardingImport", "pick file", { source });
      try {
        setIsUploading(true);
        const result = await DocumentPicker.getDocumentAsync({ type: mimeType });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          log("OnboardingImport", "file picker canceled");
          return;
        }
        const file = result.assets[0];
        log("OnboardingImport", "file selected", { uri: file.uri, name: file.name });
        const { jobId: newJobId } = await uploadImport(file.uri, source);
        log("OnboardingImport", "upload success", { jobId: newJobId });
        setActiveJobId(newJobId);
        showSnackbar(t("screens.onboarding.importStarted"), "success");
        handleCompleteOnboarding();
      } catch (err) {
        log("OnboardingImport", "upload error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsUploading(false);
      }
    },
    [t, showSnackbar, getErrorMessage, setActiveJobId, handleCompleteOnboarding],
  );

  const handleWebFilePick = useCallback(
    (source: ImportSource) => {
      pendingSourceRef.current = source;
      fileInputRef.current?.click();
    },
    [],
  );

  const handleWebFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      log("OnboardingImport", "web file selected", { name: file.name });
      try {
        setIsUploading(true);
        const fileUri = URL.createObjectURL(file);
        const { jobId: newJobId } = await uploadImport(fileUri, pendingSourceRef.current);
        log("OnboardingImport", "web upload success", { jobId: newJobId });
        setActiveJobId(newJobId);
        showSnackbar(t("screens.onboarding.importStarted"), "success");
        handleCompleteOnboarding();
      } catch (err) {
        log("OnboardingImport", "web upload error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [t, showSnackbar, getErrorMessage, setActiveJobId, handleCompleteOnboarding],
  );

  const handlePlatformPress = useCallback(
    (source: ImportSource, mimeType: string) => {
      if (Platform.OS === "web") {
        handleWebFilePick(source);
      } else {
        pickAndUploadFile(source, mimeType);
      }
    },
    [handleWebFilePick, pickAndUploadFile],
  );

  const isPending = isUploading || completeOnboardingMutation.isPending;

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 pt-6 pb-2 flex-1">
          <Text className="text-text text-2xl font-bold mb-2">
            {t("screens.onboarding.importTitle")}
          </Text>
          <Text className="text-text-muted text-sm mb-6">
            {t("screens.onboarding.importSubtitle")}
          </Text>

          {isUploading && (
            <View className="items-center py-4 mb-4">
              <ActivityIndicator color={colors.primary} />
              <Text className="text-text-muted mt-2">{t("screens.onboarding.importUploading")}</Text>
            </View>
          )}

          <PlatformCard
            icon="📺"
            name="TV Time"
            description={t("screens.import.tvtimeDesc")}
            onPress={() => handlePlatformPress("tvtime", "application/zip")}
            disabled={isPending}
          />
          <PlatformCard
            icon="🎬"
            name="Trakt"
            description={t("screens.import.traktDesc")}
            onPress={() => handlePlatformPress("trakt", "application/json")}
            disabled={isPending}
          />
          <PlatformCard
            icon="⭐"
            name="IMDb"
            description={t("screens.import.imdbDesc")}
            onPress={() => handlePlatformPress("imdb", "text/csv")}
            disabled={isPending}
          />
          <PlatformCard
            icon="🎞️"
            name="Letterboxd"
            description={t("screens.import.letterboxdDesc")}
            onPress={() => handlePlatformPress("letterboxd", "text/csv")}
            disabled={isPending}
          />
        </View>
      </ScrollView>

      <View
        className="px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          className="bg-surface py-3 rounded-lg items-center mb-3"
          onPress={handleCompleteOnboarding}
          disabled={isPending}
          activeOpacity={0.8}
        >
          <Text className="text-primary font-semibold">
            {t("screens.onboarding.importSkipText")}
          </Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === "web" && (
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleWebFileChange}
          accept=".zip,.csv,.json"
        />
      )}
    </ScreenContainer>
  );
}
