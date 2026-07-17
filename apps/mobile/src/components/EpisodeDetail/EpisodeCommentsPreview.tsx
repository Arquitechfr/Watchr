import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { CommentItem } from "../Comments/CommentItem";
import type { Comment } from "../../services/comments.service";

interface EpisodeCommentsPreviewProps {
  comments: Comment[];
  totalCount: number;
  onSeeAll: () => void;
  showId: string;
  title: string;
  season: number;
  episode: number;
}

export function EpisodeCommentsPreview({
  comments,
  totalCount,
  onSeeAll,
  showId,
  title,
  season,
  episode,
}: EpisodeCommentsPreviewProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="text-lg font-semibold text-text">{t("screens.showDetail.comments")}</Text>
          {totalCount > 0 && (
            <View className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
              <Text className="text-primary text-xs font-semibold">{totalCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text className="text-primary text-sm font-semibold">{t("common.seeAll")}</Text>
        </TouchableOpacity>
      </View>
      {comments.length > 0 ? (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            showId={showId}
            title={title}
            season={season}
            episode={episode}
          />
        ))
      ) : (
        <TouchableOpacity
          onPress={onSeeAll}
          className="py-12 items-center justify-center bg-surface rounded-lg"
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
          <Text className="text-text-muted mt-2 text-center">{t("screens.comments.empty")}</Text>
          <Text className="text-text-muted text-sm text-center">{t("screens.comments.beFirst")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
