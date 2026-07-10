import { useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";
import { useUIStore } from "../../store/uiStore";
import { Comment } from "../../services/comments.service";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "😂", "😍", "👏", "🤔", "😢"];

interface CommentActionsProps {
  comment: Comment;
  isOwn: boolean;
  isPending?: boolean;
  showReplyButton?: boolean;
  showRepliesButton?: boolean;
  onReply?: () => void;
  onViewReplies?: () => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function CommentActions({
  comment,
  isOwn,
  isPending,
  showReplyButton,
  showRepliesButton,
  onReply,
  onViewReplies,
  onLike,
  onUnlike,
  onAddReaction,
  onRemoveReaction,
  onEdit,
  onDelete,
  onReport,
}: CommentActionsProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showAlert } = useUIStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = () => {
    if (comment.likedByMe) {
      onUnlike?.(comment.id);
    } else {
      onLike?.(comment.id);
    }
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

  const handleDelete = () => {
    setShowMenu(false);
    showAlert({
      title: t("screens.comments.deleteConfirmTitle"),
      message: t("screens.comments.deleteConfirmMessage"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => onDelete?.(),
        },
      ],
    });
  };

  return (
    <View>
      <View className="flex-row items-center gap-3 mt-2">
        <TouchableOpacity onPress={handleLike} disabled={isPending} activeOpacity={0.7} className="flex-row items-center">
          <Ionicons
            name={comment.likedByMe ? "heart" : "heart-outline"}
            size={16}
            color={comment.likedByMe ? colors.danger : colors.textMuted}
          />
          {comment.likesCount > 0 && (
            <Text className="text-text-muted text-xs ml-1">{comment.likesCount}</Text>
          )}
        </TouchableOpacity>

        {showReplyButton && (
          <TouchableOpacity onPress={onReply} disabled={isPending} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setShowEmojiPicker((v) => !v)}
          disabled={isPending}
          activeOpacity={0.7}
        >
          <Ionicons name="happy-outline" size={16} color={showEmojiPicker ? colors.primary : colors.textMuted} />
        </TouchableOpacity>

        {isOwn && (
          <TouchableOpacity
            onPress={() => setShowMenu((v) => !v)}
            disabled={isPending}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={showMenu ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        )}
        {!isOwn && (
          <TouchableOpacity
            onPress={() => setShowMenu((v) => !v)}
            disabled={isPending}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={showMenu ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        )}

        {showRepliesButton && (
          <TouchableOpacity onPress={onViewReplies} activeOpacity={0.7} className="ml-auto">
            <Text className="text-primary text-xs font-semibold">
              {comment.replyCount} {t("screens.comments.title").toLowerCase()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {comment.reactions && comment.reactions.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          {comment.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => handleReaction(r.emoji)}
              className={`flex-row items-center px-2 py-0.5 rounded-full border ${
                r.reactedByMe
                  ? "bg-primary/15 border-primary/30"
                  : "bg-surface-light border-transparent"
              }`}
            >
              <Text className="text-sm">{r.emoji}</Text>
              {r.count > 1 && (
                <Text className="text-text-muted text-xs ml-1">{r.count}</Text>
              )}
            </Pressable>
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

      {showMenu && isOwn && (
        <View className="flex-row gap-4 mt-2 bg-surface-light rounded-lg px-3 py-2">
          <TouchableOpacity onPress={() => { setShowMenu(false); onEdit?.(); }} activeOpacity={0.7} className="flex-row items-center">
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text className="text-primary text-sm ml-1">{t("common.edit")}</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity onPress={handleDelete} activeOpacity={0.7} className="flex-row items-center">
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text className="text-danger text-sm ml-1">{t("common.delete")}</Text>
          </TouchableOpacity> */}
        </View>
      )}

      {showMenu && !isOwn && (
        <View className="flex-row gap-4 mt-2 bg-surface-light rounded-lg px-3 py-2">
          <TouchableOpacity onPress={() => { setShowMenu(false); onReport?.(); }} activeOpacity={0.7} className="flex-row items-center">
            <Ionicons name="flag-outline" size={16} color={colors.danger} />
            <Text className="text-danger text-sm ml-1">{t("comments.report.button")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
