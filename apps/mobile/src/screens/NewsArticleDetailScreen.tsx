import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Share, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { RootStackParamList } from "../navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { Seo } from "../components/Seo";

type NewsArticleDetailRouteProp = RouteProp<RootStackParamList, "NewsArticleDetail">;
type NewsArticleDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, "NewsArticleDetail">;

export function NewsArticleDetailScreen() {
  const route = useRoute<NewsArticleDetailRouteProp>();
  const navigation = useNavigation<NewsArticleDetailNavigationProp>();
  const { link, title } = route.params;
  const { t } = useI18n();
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(true);

  async function handleShare() {
    try {
      await Share.share({ url: link, message: title });
    } catch {
      // user dismissed share sheet
    }
  }

  async function handleOpenInBrowser() {
    try {
      const supported = await Linking.canOpenURL(link);
      if (supported) {
        await Linking.openURL(link);
      }
    } catch {
      // ignore
    }
  }

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]} fullWidth>
      <Seo title={title} url={link} />
      <View className="flex-row items-center px-3 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="flex-1 text-text font-semibold text-base" numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={handleShare} className="ml-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleOpenInBrowser} className="ml-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="open-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        {isLoading && (
          <View className="absolute inset-0 items-center justify-center z-10">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-text-muted text-sm mt-3">{t("screens.news.loadingArticle")}</Text>
          </View>
        )}
        <WebView
          source={{ uri: link }}
          onLoadEnd={() => setIsLoading(false)}
          style={{ flex: 1, backgroundColor: colors.background }}
        />
      </View>
    </ScreenContainer>
  );
}
