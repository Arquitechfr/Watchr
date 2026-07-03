import { useEffect } from "react";
import { View, Text } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { CommentsSection } from "../components/Comments/CommentsSection";
import { RootStackParamList } from "../navigation/RootNavigator";
import { log } from "../utils/logger";

type ShowCommentsRouteProp = RouteProp<RootStackParamList, "ShowComments">;
type ShowCommentsNavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowComments">;

export function ShowCommentsScreen() {
  const route = useRoute<ShowCommentsRouteProp>();
  const navigation = useNavigation<ShowCommentsNavigationProp>();
  const { showId, title, season, episode } = route.params;

  useEffect(() => {
    log("ShowComments", "mount", { showId, season, episode });
    const subtitle = season !== undefined && episode !== undefined ? `S${season}E${episode}` : title;
    navigation.setOptions({ title: `Commentaires · ${subtitle}` });
  }, [navigation, showId, title, season, episode]);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View className="flex-1 px-4 pt-4">
        {season !== undefined && episode !== undefined && (
          <Text className="text-text-muted mb-4">
            {title} — Saison {season}, Épisode {episode}
          </Text>
        )}
        <CommentsSection
          showId={showId}
          query={season !== undefined && episode !== undefined ? { season, episode } : undefined}
        />
      </View>
    </ScreenContainer>
  );
}
