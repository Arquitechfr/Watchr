import { useEffect } from "react";
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { CommentsList } from "../components/Comments/CommentsList";
import { CommentInput } from "../components/Comments/CommentInput";
import { colors } from "../theme/colors";
import {
  useCommentsForShow,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useUnlikeComment,
  useAddReaction,
  useRemoveReaction,
} from "../hooks/useComments";
import { useCommentsRealtime } from "../hooks/useCommentsRealtime";
import { RootStackParamList } from "../navigation/RootNavigator";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";

type ShowCommentsRouteProp = RouteProp<RootStackParamList, "ShowComments">;
type ShowCommentsNavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowComments">;

export function ShowCommentsScreen() {
  const route = useRoute<ShowCommentsRouteProp>();
  const navigation = useNavigation<ShowCommentsNavigationProp>();
  const { showId, title, season, episode } = route.params;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();

  useCommentsRealtime(showId);

  const query = season !== undefined && episode !== undefined ? { season, episode } : undefined;
  const { data, isLoading, refetch } = useCommentsForShow(showId, query);
  const throttledRefresh = useRefreshRateLimit();
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

  useEffect(() => {
    log("ShowComments", "mount", { showId, season, episode });
  }, [showId, season, episode]);

  const subtitle = season !== undefined && episode !== undefined ? `S${season}E${episode}` : title;
  const headerTitle = `${t("screens.showDetail.comments")} · ${subtitle}`;

  const handleCreate = (content: string, images?: string[]) => {
    createComment.mutate(
      { content, images },
      { onError: () => showSnackbar(t("screens.comments.addError"), "error") },
    );
  };

  const handleReply = (content: string, parentId: string) => {
    createComment.mutate(
      { content, parentId },
      { onError: () => showSnackbar(t("screens.comments.replyError"), "error") },
    );
  };

  const handleEdit = (id: string, content: string, images?: string[]) => {
    updateComment.mutate(
      { id, content, images },
      { onError: () => showSnackbar(t("screens.comments.editError"), "error") },
    );
  };

  const handleDelete = (id: string) => {
    deleteComment.mutate(id, {
      onError: () => showSnackbar(t("screens.comments.deleteError"), "error"),
    });
  };

  const handleLike = (id: string) => {
    likeComment.mutate(id, { onError: () => showSnackbar(t("screens.comments.likeError"), "error") });
  };

  const handleUnlike = (id: string) => {
    unlikeComment.mutate(id, {
      onError: () => showSnackbar(t("screens.comments.likeError"), "error"),
    });
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

  return (
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="flex-1 px-4 pt-4">
          {season !== undefined && episode !== undefined && (
            <Text className="text-text-muted mb-4">
              {title} — {t("screens.showDetail.season")} {season}, {t("screens.showDetail.episode")} {episode}
            </Text>
          )}
          <View className="flex-1">
            <CommentsList
              comments={data?.comments ?? []}
              isLoading={isLoading}
              isPending={isPending}
              refreshing={isLoading}
              onRefresh={() => throttledRefresh(refetch)}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          </View>
          {isAuthenticated && (
            <View className="py-3 border-t border-border">
              <CommentInput
                placeholder={t("screens.comments.placeholder")}
                onSubmit={handleCreate}
                isPending={isPending}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
