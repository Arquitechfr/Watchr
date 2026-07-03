import { View, Text, Image, TouchableOpacity, Linking } from "react-native";
import { format } from "date-fns";
import { NewsArticle } from "../services/news.service";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  const { dateFnsLocale } = useI18n();
  async function handlePress() {
    if (!article.link) return;
    try {
      const supported = await Linking.canOpenURL(article.link);
      if (supported) {
        await Linking.openURL(article.link);
      } else {
        log("NewsCard", "cannot open url", { link: article.link });
      }
    } catch (err) {
      log("NewsCard", "open url error", err);
    }
  }

  const pubDate = article.pubDate ? new Date(article.pubDate) : undefined;

  return (
    <TouchableOpacity
      className="bg-surface rounded-lg overflow-hidden mb-4 active:opacity-70"
      onPress={handlePress}
    >
      {article.image ? (
        <Image
          source={{ uri: article.image }}
          className="w-full h-40 bg-surface-light"
          resizeMode="cover"
        />
      ) : null}
      <View className="p-4">
        <Text className="text-text font-semibold text-base mb-2" numberOfLines={2}>
          {article.title}
        </Text>
        {article.description ? (
          <Text className="text-text-muted text-sm mb-3" numberOfLines={3}>
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
