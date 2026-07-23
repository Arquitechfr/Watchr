import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage as Image } from "./CachedImage";
import { format } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NewsArticle } from "../services/news.service";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";

type NewsCardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NewsCardProps {
  article: NewsArticle;
  compact?: boolean;
}

export function NewsCard({ article, compact = false }: NewsCardProps) {
  const { dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NewsCardNavigationProp>();

  function handlePress() {
    if (!article.link) return;
    navigation.navigate("NewsArticleDetail", { link: article.link, title: article.title });
  }

  const pubDate = article.pubDate ? new Date(article.pubDate) : undefined;

  return (
    <TouchableOpacity
      className="bg-surface rounded-lg overflow-hidden mb-4 active:opacity-70"
      style={compact ? { flex: 1 } : undefined}
      onPress={handlePress}
    >
      {article.image ? (
        <Image
          source={{ uri: article.image }}
          style={compact ? { width: "100%", height: 128, backgroundColor: colors.surfaceLight } : { width: "100%", height: 160, backgroundColor: colors.surfaceLight }}
        />
      ) : null}
      <View className={compact ? "p-3" : "p-4"}>
        <Text className="text-text font-semibold text-base mb-2" numberOfLines={2}>
          {article.title}
        </Text>
        {article.aiSummary ? (
          <View className="flex-row items-start mb-2">
            <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2 mt-0.5">
              <Text className="text-primary text-[10px] font-bold">AI</Text>
            </View>
            <Text className="text-text-muted text-sm flex-1" numberOfLines={compact ? 2 : 3}>
              {article.aiSummary}
            </Text>
          </View>
        ) : article.description ? (
          <Text className="text-text-muted text-sm mb-3" numberOfLines={compact ? 2 : 3}>
            {article.description.replace(/<[^>]+>/g, "")}
          </Text>
        ) : null}
        {pubDate && !Number.isNaN(pubDate.getTime()) ? (
          <Text className="text-primary text-xs">
            {format(pubDate, "d MMM yyyy", { locale: dateFnsLocale })}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
