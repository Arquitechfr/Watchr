import { Text, FlatList, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { UpcomingEpisodeRow } from "../components/UpcomingEpisodeRow";
import { UpcomingEpisode } from "../services/upcoming.service";
import { WeekSectionHeader } from "../components/WeekSectionHeader";
import { NetworkError } from "../components/NetworkError";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors } from "../theme/colors";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

export function UpcomingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading, isError, error, refetch } = useUpcomingEpisodes();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-2xl font-bold text-text mb-4">À venir</Text>
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} width="100%" height={80} className="mb-2" borderRadius={8} />
        ))}
      </ScreenContainer>
    );
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

  const hasEpisodes = (data?.thisWeek.length ?? 0) > 0 || (data?.upcoming.length ?? 0) > 0;

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-2xl font-bold text-text mb-4">À venir</Text>

      {!hasEpisodes ? (
        <EmptyState
          icon="calendar-outline"
          title="Rien de prévu"
          subtitle="Ajoute des shows en cours pour voir les prochains épisodes."
          actionLabel="Rechercher"
          onAction={() => navigation.navigate("Main")}
        />
      ) : (
        <FlatList
          data={[
            { type: "header" as const, title: "Cette semaine" },
            ...(data?.thisWeek ?? []).map((ep: UpcomingEpisode) => ({ type: "episode" as const, episode: ep })),
            { type: "header" as const, title: "Prochainement" },
            ...(data?.upcoming ?? []).map((ep: UpcomingEpisode) => ({ type: "episode" as const, episode: ep })),
          ]}
          keyExtractor={(item, index) =>
            item.type === "header" ? `header-${index}` : `${item.episode.showId}-${index}`
          }
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <WeekSectionHeader title={item.title} />;
            }
            return (
              <UpcomingEpisodeRow
                episode={item.episode}
                onPress={() => {
                  if (!item.episode.tmdbId) return;
                  navigation.navigate("ShowDetail", {
                    tmdbId: item.episode.tmdbId,
                    title: item.episode.title,
                  });
                }}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </ScreenContainer>
  );
}
