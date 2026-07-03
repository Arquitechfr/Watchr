import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTrackingList } from "../hooks/useTracking";
import { WatchEntry, WatchStatus } from "../services/tracking.service";
import { NetworkError } from "../components/NetworkError";
import { EmptyState } from "../components/EmptyState";
import { ShowCardSkeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getPosterUrl } from "../services/shows.service";
import { colors } from "../theme/colors";

const TABS: { key: WatchStatus | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "watching", label: "En cours" },
  { key: "completed", label: "Terminés" },
  { key: "plan_to_watch", label: "À voir" },
  { key: "dropped", label: "Abandonnés" },
];

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching: "En cours",
  completed: "Terminé",
  plan_to_watch: "À voir",
  dropped: "Abandonné",
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

function ShowCard({ entry, onPress }: { entry: WatchEntry; onPress: () => void }) {
  const posterUrl = getPosterUrl(entry.show.posterPath, 200);
  const watchedCount = entry.watchedEpisodes.length;
  const isUpToDate = entry.show.type === "tv" && entry.status === "completed";
  const progressLabel =
    entry.show.type === "movie"
      ? STATUS_LABELS[entry.status]
      : entry.currentSeason && entry.currentEpisode
        ? `S${entry.currentSeason} • E${entry.currentEpisode} • ${watchedCount} épisode${watchedCount > 1 ? "s" : ""} vu${watchedCount > 1 ? "s" : ""}`
        : watchedCount > 0
          ? `${watchedCount} épisode${watchedCount > 1 ? "s" : ""} vu${watchedCount > 1 ? "s" : ""}`
          : STATUS_LABELS[entry.status];

  return (
    <TouchableOpacity
      className="flex-row items-center bg-surface rounded-xl p-3 mb-3 active:opacity-70"
      onPress={onPress}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-20 h-28 rounded-lg bg-surface-light"
          resizeMode="cover"
        />
      ) : (
        <View className="w-20 h-28 rounded-lg bg-surface-light items-center justify-center">
          <Text className="text-text-muted text-xs">No image</Text>
        </View>
      )}
      <View className="flex-1 ml-4 justify-center">
        <View className="flex-row items-center mb-1">
          <Text className="text-text font-bold text-base mr-2" numberOfLines={2}>
            {entry.show.title}
          </Text>
          {isUpToDate && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
        </View>
        <Text className="text-text-muted text-sm">{progressLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function LoadingState() {
  return (
    <ScreenContainer className="px-4" edges={["top", "left", "right"]}>
      <View className="mb-6">
        <Text className="text-text-muted text-sm uppercase tracking-wider mb-1">Bibliothèque</Text>
        <Text className="text-3xl font-bold text-text">Ma bibliothèque</Text>
      </View>
      {[...Array(4)].map((_, index) => (
        <ShowCardSkeleton key={index} />
      ))}
    </ScreenContainer>
  );
}

export function MyShowsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [filter, setFilter] = useState<WatchStatus | "all">("all");
  const status = filter === "all" ? undefined : filter;
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrackingList(status);

  const entries = data?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = data?.pages[0]?.pagination.total ?? entries.length;

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <NetworkError
          isOffline={!error || !("response" in error)}
          onRetry={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  const ListHeader = (
    <View>
      <View className="mb-3">
        <Text className="text-text-muted text-sm uppercase tracking-wider mb-1">Bibliothèque</Text>
        <View className="flex-row items-baseline">
          <Text className="text-3xl font-bold text-text mr-2">Ma bibliothèque</Text>
          <Text className="text-text-muted text-base">({totalCount})</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {TABS.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              className="mr-5 pb-2"
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-semibold uppercase tracking-wide ${
                  isActive ? "text-text" : "text-text-muted"
                }`}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View
                  className="absolute bottom-0 left-0 right-0 rounded-full"
                  style={{ height: 2, backgroundColor: colors.primary }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <ScreenContainer className="px-4" edges={["top", "left", "right"]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <ShowCard
            entry={item}
            onPress={() => {
              if (!item.show.tmdbId) return;
              navigation.navigate("ShowDetail", {
                tmdbId: item.show.tmdbId,
                title: item.show.title,
              });
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="albums-outline"
            title="Aucun show"
            subtitle="Ajoute des shows depuis l'onglet Recherche."
            actionLabel="Rechercher"
            onAction={() => navigation.navigate("Main")}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </ScreenContainer>
  );
}
