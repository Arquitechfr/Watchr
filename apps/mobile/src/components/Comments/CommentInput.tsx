import { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { useI18n } from "../../i18n/useI18n";

interface CommentInputProps {
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  isPending?: boolean;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "👏", "🤔", "😢", "😡", "🎉"];

export function CommentInput({
  placeholder,
  initialValue = "",
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: CommentInputProps) {
  const { t } = useI18n();
  const [content, setContent] = useState(initialValue);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
    setShowEmojiPicker(false);
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  return (
    <View className="bg-surface rounded-lg p-3">
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder={placeholder ?? t("screens.comments.placeholder")}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
        className="text-text min-h-[60px] text-base leading-relaxed"
        editable={!isPending}
      />
      <View className="flex-row items-center justify-end mt-2">
        <Text className="text-text-muted text-xs mr-3">{content.length}/2000</Text>
        <TouchableOpacity
          onPress={() => setShowEmojiPicker((prev) => !prev)}
          disabled={isPending}
          className="mr-3 p-1"
          activeOpacity={0.7}
        >
          <Ionicons name="happy-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} disabled={isPending} className="mr-3" activeOpacity={0.7}>
            <Text className="text-text-muted">{t("common.cancel")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending || !content.trim()}
          className="flex-row items-center bg-primary px-4 py-2 rounded-lg disabled:opacity-50"
          activeOpacity={0.7}
        >
          <Ionicons name="send-outline" size={16} color={colors.background} />
          <Text className="text-background font-semibold ml-2">{submitLabel ?? t("common.send")}</Text>
        </TouchableOpacity>
      </View>
      {showEmojiPicker && (
        <View className="flex-row flex-wrap mt-2 border-t border-border pt-2">
          {QUICK_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              className="w-10 h-10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-2xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
