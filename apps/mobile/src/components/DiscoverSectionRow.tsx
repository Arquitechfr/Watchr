import { useRef } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { PosterCard } from "./PosterCard";
import { SectionHeader } from "./SectionHeader";
import { ScrollArrows } from "./ScrollArrows";
import { useDiscoverSection } from "../hooks/useDiscoverSection";
import { DiscoverSection, SearchResultItem } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";

interface DiscoverSectionRowProps {
  section: DiscoverSection;
  onShowPress: (show: SearchResultItem) => void;
  onQuickAdd: (show: SearchResultItem) => void;
  isAdding: boolean;
  isTracked: (tmdbId: number) => boolean;
}

export function DiscoverSectionRow({
  section,
  onShowPress,
  onQuickAdd,
  isAdding,
  isTracked,
}: DiscoverSectionRowProps) {
  const colors = useThemeColors();
  const listRef = useRef<FlatList>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useDiscoverSection(section.id, section.items);

  const items = data?.pages.flatMap((page) => page.items) ?? section.items;

  return (
    <View className="mb-6 relative">
      <SectionHeader title={section.title} />
      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item, index) => `${section.id}-${item.tmdbId ?? index}`}
        renderItem={({ item }) => (
          <PosterCard
            show={item}
            onPress={() => onShowPress(item)}
            onAdd={() => onQuickAdd(item)}
            isAdding={isAdding}
            isAdded={item.tmdbId ? isTracked(item.tmdbId) : false}
          />
        )}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="justify-center items-center px-4">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 0 }}
      />
      <ScrollArrows scrollRef={listRef} />
    </View>
  );
}
