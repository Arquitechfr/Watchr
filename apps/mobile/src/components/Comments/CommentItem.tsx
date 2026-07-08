import { useState } from "react";
import { View, Text, TouchableOpacity, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Comment } from "../../services/comments.service";
import { useAuthStore } from "../../store/authStore";
import { useThemeColors } from "../../theme/useThemeColors";
import { Avatar } from "../Avatar";
import { CommentInput } from "./CommentInput";
import { useI18n } from "../../i18n/useI18n";
import { useUIStore } from "../../store/uiStore";
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
  onReply?: (content: string, parentId: string) => void;
  onEdit?: (id: string, content: string, images?: string[], isSpoiler?: boolean) => void;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  variant?: "default" | "parent" | "reply";
}

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "😂", "😍", "👏", "🤔", "😢"];

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
  const showAlert = useUIStore((state) => state.showAlert);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isOwn = comment.userId === userId;
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  const handleLike = () => {
    if (comment.likedByMe) {
      onUnlike?.(comment.id);
    } else {
      onLike?.(comment.id);
    }
  };

  const handleReply = (content: string) => {
    onReply?.(content, comment.id);
    setIsReplying(false);
  };

  const handleEdit = (content: string, images?: string[], isSpoiler?: boolean) => {
    onEdit?.(comment.id, content, images, isSpoiler);
    setIsEditing(false);
  };

  const handleDelete = () => {
    showAlert({
      title: t("screens.comments.deleteConfirmTitle"),
      message: t("screens.comments.deleteConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => onDelete?.(comment.id) },
      ],
    });
  };

  const handleReaction = (emoji: string) => {
    const existing = comment.reactions?.find((r) => r.emoji === emoji);
    if (existing?.reactedByMe) {
      onRemoveReaction?.(comment.id, emoji);
    } else {
      onAddReaction?.(comment.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const showReplyButton = onReply;
  const showRepliesButton = comment.replyCount > 0 && showId;

  const isParent = variant === "parent";
  const isReply = variant === "reply";

  return (
    <View className={isReply ? "" : "mb-3"}>
      {isEditing ? (
        <CommentInput
          initialValue={comment.content}
          initialImages={comment.images}
          initialIsSpoiler={comment.isSpoiler}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
          isPending={isPending}
          submitLabel={t("common.edit")}
        />
      ) : (
        <View className={isParent ? "bg-primary/10 border border-primary/20 rounded-lg p-4" : "bg-surface rounded-lg p-3"}>
          <View className="flex-row items-center mb-2">
            <Avatar url={comment.authorAvatarUrl} size={32} />
            <View className="ml-2 flex-1">
              <View className="flex-row items-center">
                <Text className="text-text font-semibold text-sm">{comment.authorUsername}</Text>
                {comment.isSpoiler && (
                  <View className="ml-2 flex-row items-center px-1.5 py-0.5 rounded-full bg-danger/15">
                    <Ionicons name="eye-off-outline" size={11} color={colors.danger} />
                    <Text className="text-danger text-xs font-semibold ml-0.5">{t("screens.comments.spoiler")}</Text>
                  </View>
                )}
              </View>
              <Text className="text-text-muted text-xs">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </Text>
            </View>
          </View>

          {comment.isSpoiler && !spoilerRevealed ? (
            <View className="bg-surface-light rounded-lg p-3 mt-1 items-center">
              <View className="flex-row items-center mb-1">
                <Ionicons name="eye-off-outline" size={16} color={colors.danger} />
                <Text className="text-danger text-sm font-semibold ml-1">{t("screens.comments.containsSpoiler")}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSpoilerRevealed(true)}
                className="mt-1 px-3 py-1.5 rounded-lg bg-primary/15"
                activeOpacity={0.7}
              >
                <Text className="text-primary text-sm font-semibold">{t("screens.comments.reveal")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className={`text-text leading-relaxed ${isParent ? "text-base" : ""}`}>{comment.content}</Text>

              {comment.images?.length > 0 && (
                <View className="flex-row flex-wrap mt-2">
                  {comment.images.map((img, idx) => (
                    <Pressable key={idx} onPress={() => setViewingImage(img)}>
                      <Image
                        source={{ uri: img }}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 8,
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleLike}
                disabled={isPending}
                className="flex-row items-center mr-4"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={comment.likedByMe ? "heart" : "heart-outline"}
                  size={18}
                  color={comment.likedByMe ? colors.primary : colors.textMuted}
                />
                <Text className="text-text-muted text-sm ml-1">{comment.likesCount}</Text>
              </TouchableOpacity>

              {showReplyButton && (
                <TouchableOpacity
                  onPress={() => setIsReplying((prev) => !prev)}
                  disabled={isPending}
                  className="flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
                  <Text className="text-text-muted text-sm ml-1">{t("common.reply")}</Text>
                </TouchableOpacity>
              )}

              {showRepliesButton && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("CommentThread", {
                      commentId: comment.id,
                      showId: showId!,
                      title: title ?? "",
                      season,
                      episode,
                    })
                  }
                  className="flex-row items-center ml-4"
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                  <Text className="text-primary text-sm font-semibold ml-1">{comment.replyCount}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowEmojiPicker((prev) => !prev)}
                disabled={isPending}
                className="flex-row items-center ml-4"
                activeOpacity={0.7}
              >
                <Ionicons name="happy-outline" size={16} color={colors.textMuted} />
                <Text className="text-text-muted text-sm ml-1">{t("common.react")}</Text>
              </TouchableOpacity>
            </View>

            {isOwn && (
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  disabled={isPending}
                  className="mr-3"
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} disabled={isPending} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {comment.reactions?.length > 0 && (
            <View className="flex-row flex-wrap mt-2">
              {comment.reactions.map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  onPress={() => handleReaction(reaction.emoji)}
                  disabled={isPending}
                  className={`flex-row items-center mr-2 mb-2 px-2 py-1 rounded-full border ${
                    reaction.reactedByMe ? "bg-primary/20 border-primary" : "bg-surface-light border-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="text-base">{reaction.emoji}</Text>
                  <Text className={`text-sm ml-1 ${reaction.reactedByMe ? "text-primary" : "text-text-muted"}`}>
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showEmojiPicker && (
            <View className="flex-row flex-wrap mt-2 bg-surface-light rounded-lg p-2">
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleReaction(emoji)}
                  className="w-9 h-9 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {isReplying && (
        <View className="mt-2">
          <CommentInput
            placeholder={t("common.reply")}
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            isPending={isPending}
          />
        </View>
      )}
    </View>
  );
}
