import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { CommentItem } from "../components/Comments/CommentItem";
import { CommentInput } from "../components/Comments/CommentInput";
import { useThemeColors } from "../theme/useThemeColors";
import {
  useComment,
  useReplies,
  useCreateComment,
  useLikeComment,
  useUnlikeComment,
  useAddReaction,
  useRemoveReaction,
  useDeleteComment,
  useUpdateComment,
} from "../hooks/useComments";
import { RootStackParamList } from "../navigation/RootNavigator";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";

type CommentThreadRouteProp = RouteProp<RootStackParamList, "CommentThread">;
type CommentThreadNavigationProp = NativeStackNavigationProp<RootStackParamList, "CommentThread">;

export function CommentThreadScreen() {
  const route = useRoute<CommentThreadRouteProp>();
  const navigation = useNavigation<CommentThreadNavigationProp>();
  const { commentId, showId, title, season, episode } = route.params;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: parentComment, isLoading: isLoadingParent } = useComment(commentId);
  const { data: repliesData, isLoading: isLoadingReplies, refetch } = useReplies(commentId, page, limit);

  const query = season !== undefined && episode !== undefined ? { season, episode } : undefined;
  const createComment = useCreateComment(showId, query);
  const updateComment = useUpdateComment(showId, query);
  const deleteComment = useDeleteComment(showId, query);
  const likeComment = useLikeComment(showId, query);
  const unlikeComment = useUnlikeComment(showId, query);
  const addReaction = useAddReaction(showId, query);
  const removeReaction = useRemoveReaction(showId, query);

  const isPending =
    createComment.isPending ||
    updateComment.isPending ||
    deleteComment.isPending ||
    likeComment.isPending ||
    unlikeComment.isPending ||
    addReaction.isPending ||
    removeReaction.isPending;

  const headerTitle = `${t("screens.comments.title")} · ${title}`;

  const handleReply = (content: string, images?: string[], isSpoiler?: boolean) => {
    createComment.mutate(
      { 
        content, 
        images, 
        isSpoiler, 
        parentId: commentId,
        ...(season !== undefined && episode !== undefined ? { episodeRef: { season, episode } } : {})
      },
      {
        onSuccess: () => {
          refetch();
        },
        onError: () => showSnackbar(t("screens.comments.replyError"), "error"),
      },
    );
  };

  const handleEdit = (id: string, content: string, images?: string[], isSpoiler?: boolean) => {
    updateComment.mutate(
      { id, content, images, isSpoiler },
      { onError: () => showSnackbar(t("screens.comments.editError"), "error") },
    );
  };

  const handleDelete = (id: string) => {
    deleteComment.mutate(id, {
      onSuccess: () => {
        refetch();
      },
      onError: () => showSnackbar(t("screens.comments.deleteError"), "error"),
    });
  };

  const handleLike = (id: string) => {
    likeComment.mutate(id, { onError: () => showSnackbar(t("screens.comments.likeError"), "error") });
  };

  const handleUnlike = (id: string) => {
    unlikeComment.mutate(id, { onError: () => showSnackbar(t("screens.comments.likeError"), "error") });
  };

  const handleAddReaction = (id: string, emoji: string) => {
    addReaction.mutate(
      { id, emoji },
      { onError: () => showSnackbar(t("screens.comments.likeError"), "error") },
    );
  };

  const handleRemoveReaction = (id: string, emoji: string) => {
    removeReaction.mutate(
      { id, emoji },
      { onError: () => showSnackbar(t("screens.comments.likeError"), "error") },
    );
  };

  log("CommentThread", "render", { commentId, repliesTotal: repliesData?.total ?? 0 });

  const replies = repliesData?.replies ?? [];
  const totalReplies = repliesData?.total ?? 0;
  const hasMore = page * limit < totalReplies;

  const renderParentComment = () => {
    if (isLoadingParent || !parentComment) {
      return (
        <View className="py-6 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    return (
      <View className="mb-4">
        <CommentItem
          comment={parentComment}
          showId={showId}
          title={title}
          season={season}
          episode={episode}
          isPending={isPending}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLike={handleLike}
          onUnlike={handleUnlike}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
          variant="parent"
        />
        <View className="mt-2 border-b border-border" />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScreenContainer edges={["top", "left", "right"]}>
        <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="p-1">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-text font-semibold text-lg flex-1 text-center mx-2" numberOfLines={1}>
            {headerTitle}
          </Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 px-4 pt-4">
          <FlatList
            data={replies}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderParentComment}
            renderItem={({ item }) => (
              <View className="flex-row">
                <View className="border-l-2 border-border ml-4 pl-3 flex-1 mb-3 mt-1">
                  <CommentItem
                    comment={item}
                    showId={showId}
                    title={title}
                    season={season}
                    episode={episode}
                    isPending={isPending}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onLike={handleLike}
                    onUnlike={handleUnlike}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    variant="reply"
                  />
                </View>
              </View>
            )}
            ListEmptyComponent={
              !isLoadingReplies ? (
                <View className="py-8 items-center">
                  <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                  <Text className="text-text-muted mt-2 text-center">{t("screens.comments.noReplies")}</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  onPress={() => setPage((p) => p + 1)}
                  className="py-3 items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-primary font-semibold">{t("common.seeAll")}</Text>
                </TouchableOpacity>
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={isLoadingReplies} onRefresh={refetch} tintColor={colors.primary} />
            }
            contentContainerStyle={{ paddingBottom: 16 }}
          />
          {isAuthenticated && (
            <View
              className="py-3 border-t border-border"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <CommentInput
                placeholder={t("common.reply")}
                onSubmit={handleReply}
                isPending={isPending}
              />
            </View>
          )}
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
