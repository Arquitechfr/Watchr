import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Comment } from "../../services/comments.service";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { CommentInput } from "./CommentInput";

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  isPending?: boolean;
  onReply?: (content: string, parentId: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
}

export function CommentItem({
  comment,
  depth = 0,
  isPending,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
}: CommentItemProps) {
  const userId = useAuthStore((state) => state.userId);
  const isOwn = comment.userId === userId;
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleEdit = (content: string) => {
    onEdit?.(comment.id, content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Supprimer le commentaire", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => onDelete?.(comment.id) },
    ]);
  };

  const maxDepth = 2;
  const showReplyButton = depth < maxDepth && onReply;

  return (
    <View className={`mb-3 ${depth > 0 ? "ml-4 border-l border-border pl-3" : ""}`}>
      {isEditing ? (
        <CommentInput
          initialValue={comment.content}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
          isPending={isPending}
          submitLabel="Modifier"
        />
      ) : (
        <View className="bg-surface rounded-lg p-3">
          <Text className="text-text leading-relaxed">{comment.content}</Text>

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
                  <Text className="text-text-muted text-sm ml-1">Répondre</Text>
                </TouchableOpacity>
              )}
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
        </View>
      )}

      {isReplying && (
        <View className="mt-2">
          <CommentInput
            placeholder="Répondre..."
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            isPending={isPending}
          />
        </View>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <View className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              isPending={isPending}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              onUnlike={onUnlike}
            />
          ))}
        </View>
      )}
    </View>
  );
}
