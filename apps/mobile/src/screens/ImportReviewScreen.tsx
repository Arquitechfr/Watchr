import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { CachedImage as Image } from "../components/CachedImage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getImportReviews, resolveImportReview, ImportReviewItem } from "../services/import.service";
import { ScreenContainer } from "../components/ScreenContainer";
import { EmptyState } from "../components/EmptyState";
import { useUIStore } from "../store/uiStore";
import { useErrorMessage } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";
import { Seo } from "../components/Seo";
import { SubScreenHeader } from "../components/SubScreenHeader";

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w200";

interface ImportReviewScreenProps {
  route: { params: { jobId: string } };
}

export function ImportReviewScreen({ route }: ImportReviewScreenProps) {
  const { jobId } = route.params;
  const colors = useThemeColors();
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["import-reviews", jobId],
    queryFn: () => getImportReviews(jobId),
  });

  const handleResolve = useCallback(
    async (reviewId: string, tmdbId: number | null, skip: boolean) => {
      setResolvingId(reviewId);
      try {
        await resolveImportReview(reviewId, tmdbId, skip);
        log("ImportReview", "resolved", { reviewId, tmdbId, skip });
        showSnackbar(
          skip ? t("screens.importReview.skipped") : t("screens.importReview.resolved"),
          "success",
        );
        queryClient.invalidateQueries({ queryKey: ["import-reviews", jobId] });
      } catch (err) {
        log("ImportReview", "resolve error", err);
        showSnackbar(getErrorMessage(err), "error");
      } finally {
        setResolvingId(null);
      }
    },
    [t, showSnackbar, getErrorMessage, queryClient, jobId],
  );

  const reviews = data?.reviews ?? [];
  const pendingCount = data?.pending ?? 0;

  const renderItem = ({ item }: { item: ImportReviewItem }) => {
    const isResolving = resolvingId === item.id;
    return (
      <View className="bg-surface rounded-lg p-4 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-text font-semibold text-base">{item.sourceTitle}</Text>
            <Text className="text-text-muted text-sm">
              {item.sourceType === "series" ? t("common.tv") : t("common.movie")}
              {item.sourceYear ? ` · ${item.sourceYear}` : ""}
            </Text>
          </View>
        </View>

        {item.candidates.length === 0 ? (
          <Text className="text-text-muted text-sm mb-3">
            {t("screens.importReview.noCandidates")}
          </Text>
        ) : (
          <View className="mb-3">
            {item.candidates.map((candidate, index) => (
              <TouchableOpacity
                key={`${candidate.tmdbId}-${index}`}
                className="flex-row items-center bg-surface-light rounded-lg p-3 mb-2"
                onPress={() => handleResolve(item.id, candidate.tmdbId, false)}
                disabled={isResolving}
                activeOpacity={0.7}
              >
                {candidate.posterPath ? (
                  <Image
                    source={{ uri: `${TMDB_IMG_BASE}${candidate.posterPath}` }}
                    style={{ width: 48, height: 72, borderRadius: 8, marginRight: 12 }}
                  />
                ) : (
                  <View
                    className="w-12 h-18 rounded mr-3 items-center justify-center bg-surface"
                  >
                    <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-text font-medium">{candidate.title}</Text>
                  <Text className="text-text-muted text-sm">
                    {candidate.year ?? "—"}
                  </Text>
                  <Text className="text-primary text-xs mt-1">
                    {t("screens.importReview.matchScore")}:{" "}
                    {(candidate.confidenceScore * 100).toFixed(0)}%
                  </Text>
                </View>
                <View
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-background font-semibold text-sm">
                    {t("screens.importReview.select")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          className="py-2 items-center"
          onPress={() => handleResolve(item.id, null, true)}
          disabled={isResolving}
        >
          {isResolving ? (
            <ActivityIndicator color={colors.textMuted} size="small" />
          ) : (
            <Text className="text-text-muted text-sm">
              {t("screens.importReview.skip")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.importReview")} />
      <SubScreenHeader title={t("screens.importReview.title")} />
      <View className="md:max-w-lg md:mx-auto w-full">
      <Text className="text-text-muted text-sm mb-4">
        {pendingCount} {t("screens.importReview.remaining")}
      </Text>

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={t("screens.importReview.allResolved")}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-24"
        />
      )}
      </View>
    </ScreenContainer>
  );
}
