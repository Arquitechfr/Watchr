import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Comment } from "../../services/comments.service";
import { colors } from "../../theme/colors";
import { CommentItem } from "./CommentItem";

interface CommentsListProps {
  comments: Comment[];
  isLoading?: boolean;
  isPending?: boolean;
  onReply?: (content: string, parentId: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
}

export function CommentsList({
  comments,
  isLoading,
  isPending,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
}: CommentsListProps) {
  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View className="py-8 items-center">
        <Text className="text-text-muted">Aucun commentaire pour le moment.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CommentItem
          comment={item}
          isPending={isPending}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onLike={onLike}
          onUnlike={onUnlike}
        />
      )}
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}
