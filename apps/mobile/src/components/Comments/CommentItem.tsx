import { useState } from "react";
import { View, Text, TouchableOpacity, Image, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Comment } from "../../services/comments.service";
import { useAuthStore } from "../../store/authStore";
import { useThemeColors } from "../../theme/useThemeColors";
import { Avatar } from "../Avatar";
import { CommentInput } from "./CommentInput";
import { CommentImageViewer } from "./CommentImageViewer";
import { CommentActions } from "./CommentActions";
import { useI18n } from "../../i18n/useI18n";
import { formatDistanceToNow } from "date-fns";

type RootStackParamList = {
  CommentThread: { commentId: string; showId: string; title: string; season?: number; episode?: number };
};

interface CommentItemProps {
  comment: Comment;
  showId?: string;
  title?: string;
  season?: number;
  episode?: number;
  isPending?: boolean;
  onReply?: (content: string, parentId: string, images?: string[], isSpoiler?: boolean) => void;
  onEdit?: (id: string, content: string, images?: string[], isSpoiler?: boolean) => void;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  variant?: "default" | "parent" | "reply";
}

export function CommentItem({
  comment,
  showId,
  title,
  season,
  episode,
  isPending,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onAddReaction,
  onRemoveReaction,
  variant = "default",
}: CommentItemProps) {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const userId = useAuthStore((state) => state.userId);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isOwn = comment.userId === userId;
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const isEdited = comment.updatedAt !== comment.createdAt;

  const isParent = variant === "parent";
  const isReply = variant === "reply";

  const handleReply = (content: string, images?: string[], isSpoiler?: boolean) => {
    onReply?.(content, comment.id, images, isSpoiler);
    setIsReplying(false);
  };

  const handleEdit = (content: string, images?: string[], isSpoiler?: boolean) => {
    onEdit?.(comment.id, content, images, isSpoiler);
    setIsEditing(false);
  };

  const handleViewReplies = () => {
    navigation.navigate("CommentThread", {
      commentId: comment.id,
      showId: showId!,
      title: title ?? "",
      season,
      episode,
    });
  };

  return (
    <View className={isReply ? "" : "mb-2.5"}>
      {isEditing ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <CommentInput
            initialValue={comment.content}
            initialImages={comment.images}
            initialIsSpoiler={comment.isSpoiler}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            isPending={isPending}
            submitLabel={t("common.edit")}
          />
        </KeyboardAvoidingView>
      ) : (
        <View className={isParent ? "bg-primary/8 border border-primary/20 rounded-xl p-4" : "flex-row"}>
          {isParent && (
            <View className="flex-row items-center mb-2">
              <Avatar url={comment.authorAvatarUrl} size={36} />
              <View className="ml-2.5 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-text font-semibold text-sm">{comment.authorUsername}</Text>
                  {comment.isSpoiler && (
                    <View className="ml-2 flex-row items-center px-1.5 py-0.5 rounded-full bg-danger/15">
                      <Ionicons name="eye-off-outline" size={10} color={colors.danger} />
                      <Text className="text-danger text-xs font-semibold ml-0.5">{t("screens.comments.spoiler")}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-text-muted text-xs mt-0.5">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateFnsLocale })}
                  {isEdited && <Text className="text-text-muted"> · {t("screens.comments.edited")}</Text>}
                </Text>
              </View>
            </View>
          )}

          {!isParent && (
            <View className="mr-2.5 mt-0.5">
              <Avatar url={comment.authorAvatarUrl} size={28} />
            </View>
          )}

          <View className="flex-1">
            {!isParent && (
              <View className="flex-row items-center flex-wrap">
                <Text className="text-text font-semibold text-sm">{comment.authorUsername}</Text>
                {comment.isSpoiler && (
                  <View className="ml-2 flex-row items-center px-1.5 py-0.5 rounded-full bg-danger/15">
                    <Ionicons name="eye-off-outline" size={10} color={colors.danger} />
                    <Text className="text-danger text-xs font-semibold ml-0.5">{t("screens.comments.spoiler")}</Text>
                  </View>
                )}
                <Text className="text-text-muted text-xs ml-2">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateFnsLocale })}
                  {isEdited && <Text className="text-text-muted"> · {t("screens.comments.edited")}</Text>}
                </Text>
              </View>
            )}

            {comment.isSpoiler && !spoilerRevealed ? (
              <View className="bg-surface-light rounded-lg p-3 mt-1.5 items-center">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="eye-off-outline" size={15} color={colors.danger} />
                  <Text className="text-danger text-sm font-semibold ml-1">{t("screens.comments.containsSpoiler")}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSpoilerRevealed(true)}
                  className="px-3 py-1.5 rounded-lg bg-primary/15"
                  activeOpacity={0.7}
                >
                  <Text className="text-primary text-sm font-semibold">{t("screens.comments.reveal")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className={`text-text leading-relaxed mt-0.5 ${isParent ? "text-base" : "text-sm"}`}>
                  {comment.content}
                </Text>

                {comment.images?.length > 0 && (
                  <View className="flex-row flex-wrap mt-2 gap-1.5">
                    {comment.images.map((img, idx) => (
                      <Pressable key={idx} onPress={() => setViewingImage(img)}>
                        <Image
                          source={{ uri: img }}
                          style={{
                            width: comment.images.length === 1 ? 200 : 90,
                            height: comment.images.length === 1 ? 200 : 90,
                            borderRadius: 12,
                          }}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            <CommentActions
              comment={comment}
              isOwn={isOwn}
              isPending={isPending}
              showReplyButton={!!onReply && !comment.parentId}
              showRepliesButton={comment.replyCount > 0 && !!showId && !isParent}
              onReply={() => setIsReplying((v) => !v)}
              onViewReplies={handleViewReplies}
              onLike={onLike}
              onUnlike={onUnlike}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              onEdit={() => setIsEditing(true)}
              onDelete={() => onDelete?.(comment.id)}
            />
          </View>
        </View>
      )}

      {isReplying && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="mt-2">
          <CommentInput
            placeholder={t("common.reply")}
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            isPending={isPending}
          />
        </KeyboardAvoidingView>
      )}

      <CommentImageViewer
        visible={viewingImage !== null}
        imageUri={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </View>
  );
}
