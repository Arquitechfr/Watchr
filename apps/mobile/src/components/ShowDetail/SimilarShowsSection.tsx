import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "../CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { ScrollArrows } from "../ScrollArrows";
import { Skeleton } from "../Skeleton";
import { getPosterUrl, type SimilarShow } from "../../services/shows.service";
import { useRef } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";

interface SimilarShowsSectionProps {
  shows: SimilarShow[];
  source?: string;
  isLoading: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

export function SimilarShowsSection({ shows, source, isLoading, navigation }: SimilarShowsSectionProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  if (isLoading) {
    return (
      <View className="mb-6">
        <Skeleton width="40%" height={24} className="mb-3" />
        <View className="flex-row">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} width={140} height={210} borderRadius={8} className="mr-3" />
          ))}
        </View>
      </View>
    );
  }

  if (!shows || shows.length === 0) return null;

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-3">
        <Text className="text-lg font-semibold text-text">{t("screens.showDetail.similarShows")}</Text>
        {source === "ai" && (
          <View className="bg-primary/20 rounded px-1.5 py-0.5 ml-2">
            <Text className="text-primary text-[10px] font-bold">AI</Text>
          </View>
        )}
      </View>
      <View className="relative">
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
          {shows.map((item) => (
            <TouchableOpacity
              key={`${item.tmdbId}-${item.type}`}
              onPress={() => navigation.navigate("ShowDetail", { tmdbId: item.tmdbId, title: item.title })}
              activeOpacity={0.7}
              style={{ width: 140 }}
            >
              {item.posterPath ? (
                <Image
                  source={{ uri: getPosterUrl(item.posterPath, 200) }}
                  style={{ width: 140, height: 210, borderRadius: 8, marginBottom: 8 }}
                />
              ) : (
                <View className="w-full h-[210px] rounded-lg bg-surface-light items-center justify-center mb-2">
                  <Ionicons name="film-outline" size={28} color={colors.textMuted} />
                </View>
              )}
              <Text className="text-text text-sm font-medium" numberOfLines={2}>{item.title}</Text>
              {source === "ai" && item.reason && (
                <Text className="text-text-muted text-xs mt-0.5" numberOfLines={2}>{item.reason}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollArrows scrollRef={scrollRef} />
      </View>
    </View>
  );
}
