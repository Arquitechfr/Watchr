import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { StatCard } from "./StatCard";

interface YearInReviewModalProps {
  visible: boolean;
  onClose: () => void;
  yearInReview: {
    data: {
      year: number;
      totalShows: number;
      totalEpisodesWatched: number;
      totalComments: number;
      totalRatings: number;
      topShows: { title: string; episodesWatched: number }[];
      favoriteGenre: string;
      averageRating: number;
    };
    aiSummary?: string;
    highlights: string[];
  } | null;
  isLoading: boolean;
}

export function YearInReviewModal({ visible, onClose, yearInReview, isLoading }: YearInReviewModalProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
        <View className="flex-row items-center px-4 pb-4 border-b border-border">
          <TouchableOpacity onPress={onClose} className="mr-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-text font-bold text-lg flex-1">{t("screens.profile.yearInReviewTitle")}</Text>
        </View>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-12">
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-text-muted mt-3">{t("screens.profile.yearInReviewLoading")}</Text>
            </View>
          ) : yearInReview ? (
            <View>
              <View className="bg-primary/15 rounded-lg p-4 mb-6" style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <View className="flex-row items-center mb-2">
                  <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2">
                    <Text className="text-primary text-[10px] font-bold">AI</Text>
                  </View>
                  <Text className="text-text font-semibold text-base">{yearInReview.data.year}</Text>
                </View>
                {yearInReview.aiSummary ? (
                  <Text className="text-text leading-relaxed">{yearInReview.aiSummary}</Text>
                ) : (
                  <Text className="text-text-muted italic">{t("screens.profile.yearInReviewNoSummary")}</Text>
                )}
              </View>

              {yearInReview.highlights.length > 0 && (
                <View className="mb-6">
                  <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.yearInReviewHighlights")}</Text>
                  <View className="gap-2">
                    {yearInReview.highlights.map((highlight: string, index: number) => (
                      <View key={`highlight-${index}`} className="flex-row items-start bg-surface rounded-lg p-3">
                        <Ionicons name="star" size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text className="text-text text-sm flex-1">{highlight}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-row flex-wrap gap-3 mb-6">
                <View className="w-[48%]">
                  <StatCard icon="tv-outline" value={yearInReview.data.totalShows} label={t("screens.profile.statsShowsFollowed")} />
                </View>
                <View className="w-[48%]">
                  <StatCard icon="play-circle-outline" value={yearInReview.data.totalEpisodesWatched} label={t("screens.profile.statsEpisodesWatched")} />
                </View>
                <View className="w-[48%]">
                  <StatCard icon="chatbubble-outline" value={yearInReview.data.totalComments} label={t("screens.profile.statsComments")} />
                </View>
                <View className="w-[48%]">
                  <StatCard icon="star-outline" value={yearInReview.data.totalRatings} label={t("screens.profile.yearInReviewRatings")} />
                </View>
              </View>

              {yearInReview.data.topShows.length > 0 && (
                <View className="mb-6">
                  <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.yearInReviewTopShows")}</Text>
                  <View className="gap-2">
                    {yearInReview.data.topShows.map((show: { title: string; episodesWatched: number }, index: number) => (
                      <View key={`top-show-${index}`} className="flex-row items-center bg-surface rounded-lg p-3">
                        <View className="bg-primary/20 rounded-full w-8 h-8 items-center justify-center mr-3">
                          <Text className="text-primary font-bold text-sm">{index + 1}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-text font-medium">{show.title}</Text>
                          <Text className="text-text-muted text-xs">{show.episodesWatched} {t("screens.showDetail.episodes").toLowerCase()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className="bg-surface rounded-lg p-4 mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.profile.yearInReviewFavGenre")}</Text>
                  <Text className="text-primary font-medium">{yearInReview.data.favoriteGenre}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.profile.yearInReviewAvgRating")}</Text>
                  <Text className="text-primary font-medium">{yearInReview.data.averageRating > 0 ? `${yearInReview.data.averageRating}/10` : "—"}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center py-12">
              <Text className="text-text-muted">{t("screens.profile.yearInReviewNoData")}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
