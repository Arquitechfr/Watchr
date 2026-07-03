import { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

interface CommentInputProps {
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  isPending?: boolean;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
}

export function CommentInput({
  placeholder = "Écrire un commentaire...",
  initialValue = "",
  submitLabel = "Envoyer",
  isPending,
  onSubmit,
  onCancel,
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  };

  return (
    <View className="bg-surface rounded-lg p-3">
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
        className="text-text min-h-[60px] text-base leading-relaxed"
        editable={!isPending}
      />
      <View className="flex-row items-center justify-end mt-2">
        <Text className="text-text-muted text-xs mr-3">{content.length}/2000</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} disabled={isPending} className="mr-3" activeOpacity={0.7}>
            <Text className="text-text-muted">Annuler</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending || !content.trim()}
          className="flex-row items-center bg-primary px-4 py-2 rounded-lg disabled:opacity-50"
          activeOpacity={0.7}
        >
          <Ionicons name="send-outline" size={16} color={colors.background} />
          <Text className="text-background font-semibold ml-2">{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
