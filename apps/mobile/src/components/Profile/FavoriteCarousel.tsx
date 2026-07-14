import { useState, useMemo, useRef } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, Pressable, FlatList, ActivityIndicator, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { getPosterUrl } from "../../services/shows.service";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useLibrary } from "../../hooks/useLibrary";
import { useAddFavorite, useFavoriteShowIds } from "../../hooks/useFavorites";
import { useUIStore } from "../../store/uiStore";
import { ScrollArrows } from "../ScrollArrows";
import type { FavoriteItem } from "../../services/favorites.service";
import type { LibraryItem } from "../../services/library.service";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FavoriteCarouselProps {
  items: FavoriteItem[];
  type: "tv" | "movie";
  onRefetch?: () => void;
}

export function FavoriteCarousel({ items, type, onRefetch }: FavoriteCarouselProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sectionTitle = type === "tv" ? t("screens.profile.favoritesTvSection") : t("screens.profile.favoritesMovieSection");

  return (
    <View>
      {items.length === 0 ? (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          className="rounded-lg items-center justify-center py-8"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" }}
        >
          <View className="items-center">
            <View
              className="rounded-full items-center justify-center mb-3"
              style={{ width: 48, height: 48, backgroundColor: colors.primary }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </View>
            <Text className="text-text font-semibold text-base">{sectionTitle}</Text>
            <Text className="text-text-muted text-sm mt-1">{t("screens.profile.favoritesAddHint")}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <Text className="text-text font-semibold text-base">{sectionTitle}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
                hitSlop={8}
                className="ml-2"
              >
                <View
                  className="rounded-full items-center justify-center"
                  style={{ width: 24, height: 24, backgroundColor: colors.primary }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Library", { tab: type })}>
              <Text className="text-primary text-sm">{t("common.seeAll")}</Text>
            </TouchableOpacity>
          </View>
          <View className="relative">
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pb-2"
          >
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigation.navigate("ShowDetail", { tmdbId: item.tmdbId, title: item.title })}
                activeOpacity={0.7}
                style={{ width: 100 }}
              >
                <View className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.surface }}>
                  {item.posterPath ? (
                    <Image
                      source={{ uri: getPosterUrl(item.posterPath, 200) }}
                      style={{ width: 100, height: 150 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className="items-center justify-center"
                      style={{ width: 100, height: 150, backgroundColor: colors.surface }}
                    >
                      <Text className="text-text-muted text-xs text-center px-2">{item.title}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-text text-xs mt-1" numberOfLines={2}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollArrows scrollRef={scrollRef} scrollAmount={200} />
          </View>
        </>
      )}

      <AddFavoriteModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          onRefetch?.();
        }}
        type={type}
        title={sectionTitle}
      />
    </View>
  );
}

interface AddFavoriteModalProps {
  visible: boolean;
  onClose: () => void;
  type: "tv" | "movie";
  title: string;
}

function AddFavoriteModal({ visible, onClose, type, title }: AddFavoriteModalProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useLibrary(type);
  const { data: favoriteIds } = useFavoriteShowIds();
  const addFavorite = useAddFavorite();
  const [search, setSearch] = useState("");

  const libraryItems = data?.pages.flatMap((p) => p.data) ?? [];
  const favoriteIdSet = new Set(favoriteIds ?? []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return libraryItems;
    const q = search.toLowerCase().trim();
    return libraryItems.filter((item) => item.show.title.toLowerCase().includes(q));
  }, [libraryItems, search]);

  function handleAdd(item: LibraryItem) {
    addFavorite.mutate(item.showId, {
      onSuccess: () => {
        showSnackbar(t("screens.profile.favoritesAdded"), "success");
      },
      onError: () => {
        showSnackbar(t("errors.unknown"), "error");
      },
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
        <TouchableOpacity
          className="absolute top-0 left-0 right-0 bottom-0"
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          className="rounded-t-2xl relative"
          style={{ backgroundColor: colors.background, maxHeight: "80%", flex: 1 }}
        >
          <View className="flex-row items-center justify-between px-4 py-4 border-b" style={{ borderBottomColor: colors.border }}>
            <Text className="text-text text-lg font-bold">{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View className="px-4 py-3">
            <View
              className="flex-row items-center rounded-lg px-3"
              style={{ backgroundColor: colors.surface, height: 40 }}
            >
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("common.search")}
                placeholderTextColor={colors.textMuted}
                className="flex-1 ml-2 text-text text-sm"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerClassName="px-4 pb-3"
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage && !search.trim()) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-text-muted text-sm">
                  {search.trim() ? t("common.noResults") : t("screens.profile.favoritesNoLibraryItems")}
                </Text>
                {!search.trim() && (
                  <Text className="text-text-muted mt-1 text-center text-xs">
                    {t("screens.profile.favoritesNoLibraryItemsSubtitle")}
                  </Text>
                )}
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-4">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isFavorite = favoriteIdSet.has(item.showId);
              return (
                <View className="flex-row items-center" style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 8 }}>
                  {item.show.posterPath ? (
                    <Image
                      source={{ uri: getPosterUrl(item.show.posterPath, 92) }}
                      style={{ width: 40, height: 60, borderRadius: 4 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className="items-center justify-center"
                      style={{ width: 40, height: 60, backgroundColor: colors.border, borderRadius: 4 }}
                    >
                      <Ionicons name="image-outline" size={16} color={colors.textMuted} />
                    </View>
                  )}
                  <Text className="text-text text-sm flex-1 mx-3" numberOfLines={2}>{item.show.title}</Text>
                  <TouchableOpacity
                    onPress={() => handleAdd(item)}
                    disabled={isFavorite || addFavorite.isPending}
                    activeOpacity={0.7}
                    className="rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: isFavorite ? colors.border : colors.primary,
                    }}
                  >
                    <Text style={{ color: isFavorite ? colors.textMuted : "#fff", fontSize: 13, fontWeight: "600" }}>
                      {isFavorite ? t("screens.profile.favoritesAlready") : t("screens.profile.favoritesAddBtn")}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
