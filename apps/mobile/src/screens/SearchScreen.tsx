import { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShowSearch } from "../hooks/useShowSearch";
import { ShowCard } from "../components/ShowCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { ShowCardSkeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/RootNavigator";
import { SearchResultItem } from "../services/shows.service";
import { log } from "../utils/logger";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { data, isLoading, isError, error, refetch } = useShowSearch(debouncedQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed) {
        log("Search", "debounced query", { query: trimmed });
      }
      setDebouncedQuery(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const allResults = data ? [...data.tmdb, ...data.tvdb] : [];
  const hasResults = allResults.length > 0;
  const showEmpty = !isLoading && !isError && debouncedQuery.length > 0 && !hasResults;

  function handleShowPress(show: SearchResultItem) {
    if (!show.tmdbId) return;
    log("Search", "show selected", { tmdbId: show.tmdbId, title: show.title });
    navigation.navigate("ShowDetail", { tmdbId: show.tmdbId, title: show.title });
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-2xl font-bold text-text mb-4">Rechercher</Text>
        <TextInput
          className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border"
          placeholder="Série, film..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        {isLoading && (
          <View className="mt-2">
            {[...Array(4)].map((_, index) => (
              <ShowCardSkeleton key={index} />
            ))}
          </View>
        )}

        {isError && (
          <NetworkError
            isOffline={!error || !("response" in error)}
            onRetry={() => refetch()}
          />
        )}

        {showEmpty && (
          <EmptyState
            icon="search-outline"
            title="Aucun résultat"
            subtitle={`Aucun show trouvé pour "${debouncedQuery}".`}
          />
        )}

        {!isLoading && !isError && (
          <FlatList
            data={allResults}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            renderItem={({ item }) => (
              <ShowCard show={item} onPress={() => handleShowPress(item)} />
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              debouncedQuery.length === 0 ? (
                <EmptyState
                  icon="search-outline"
                  title="Trouve ton prochain show"
                  subtitle="Tape un titre pour rechercher une série ou un film."
                />
              ) : null
            }
          />
        )}
      </ScreenContainer>
    </TouchableWithoutFeedback>
  );
}
