import { useRef } from "react";
import { View, FlatList } from "react-native";
import { PosterCard } from "./PosterCard";
import { SectionHeader } from "./SectionHeader";
import { ScrollArrows } from "./ScrollArrows";
import { RecommendationItem, SearchResultItem } from "../services/shows.service";
import { useI18n } from "../i18n/useI18n";

interface RecommendationsRowProps {
  recommendations: RecommendationItem[];
  onShowPress: (show: SearchResultItem) => void;
  onQuickAdd: (show: SearchResultItem) => void;
  isAdding: boolean;
  isTracked: (tmdbId: number) => boolean;
}

function toSearchResultItem(item: RecommendationItem): SearchResultItem {
  return {
    tmdbId: item.tmdbId,
    type: item.type,
    title: item.title,
    posterPath: item.posterPath,
    overview: item.overview,
    firstAirDate: item.firstAirDate,
    source: "tmdb",
  };
}

export function RecommendationsRow({
  recommendations,
  onShowPress,
  onQuickAdd,
  isAdding,
  isTracked,
}: RecommendationsRowProps) {
  const { t } = useI18n();
  const listRef = useRef<FlatList>(null);

  if (recommendations.length === 0) return null;

  const items = recommendations.map(toSearchResultItem);

  return (
    <View className="mb-6 relative">
      <SectionHeader title={t("screens.search.recommendedForYou")} />
      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item, index) => `rec-${item.tmdbId ?? index}`}
        renderItem={({ item, index }) => (
          <PosterCard
            show={item}
            onPress={() => onShowPress(item)}
            onAdd={() => onQuickAdd(item)}
            isAdding={isAdding}
            isAdded={item.tmdbId ? isTracked(item.tmdbId) : false}
            subtitle={recommendations[index]?.reason}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      />
      <ScrollArrows scrollRef={listRef} />
    </View>
  );
}
