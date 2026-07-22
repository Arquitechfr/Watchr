import { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useUIStore } from "../store/uiStore";
import { uploadCommentImage } from "../services/upload.service";
import { useErrorMessage } from "../services/api";
import type { MessageAttachment } from "../services/message.service";

interface MessageInputProps {
  onSend: (content: string, attachments?: MessageAttachment[]) => void;
  isPending?: boolean;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "👏", "🤔", "😢", "😡", "🎉", "❤️", "😎"];
const MAX_IMAGES = 4;

export function MessageInput({ onSend, isPending }: MessageInputProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setContent("");
    setAttachments([]);
    setShowEmojiPicker(false);
  }, [content, attachments, onSend]);

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  async function pickImages() {
    if (attachments.length >= MAX_IMAGES) {
      showSnackbar(t("messages.maxImages"), "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const remaining = MAX_IMAGES - attachments.length;
    const assets = result.assets.slice(0, remaining);

    setUploadingCount(assets.length);
    const uploaded: MessageAttachment[] = [];
    for (const asset of assets) {
      try {
        const file = {
          uri: asset.uri,
          type: asset.mimeType ?? "image/jpeg",
          name: `image.${(asset.mimeType ?? "image/jpeg").split("/")[1]}`,
        };
        const { url } = await uploadCommentImage(file);
        uploaded.push({ type: "image", imageUrl: url });
      } catch (error) {
        showSnackbar(getErrorMessage(error), "error");
      }
    }
    setUploadingCount(0);
    if (uploaded.length > 0) {
      setAttachments((prev) => [...prev, ...uploaded]);
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <View className="px-3 py-2 border-t border-border">
      {attachments.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          {attachments.map((att, idx) => (
            <View key={idx} className="relative">
              {att.type === "image" && att.imageUrl ? (
                <Image
                  source={{ uri: att.imageUrl }}
                  style={{ width: 70, height: 70, borderRadius: 10 }}
                  resizeMode="cover"
                />
              ) : null}
              <TouchableOpacity
                onPress={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 items-center justify-center rounded-full"
                style={{ width: 22, height: 22, backgroundColor: colors.danger }}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-end">
        <View className="flex-1 flex-row items-end rounded-2xl" style={{ backgroundColor: colors.surface }}>
          <TouchableOpacity
            onPress={pickImages}
            disabled={isPending || uploadingCount > 0 || attachments.length >= MAX_IMAGES}
            activeOpacity={0.7}
            className="items-center justify-center pb-2.5 pl-3"
          >
            {uploadingCount > 0 ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <TextInput
            className="flex-1 text-text text-sm leading-relaxed py-2.5 px-2"
            style={{ maxHeight: 100 }}
            value={content}
            onChangeText={setContent}
            placeholder={t("messages.typeMessage")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            editable={!isPending}
          />

          <TouchableOpacity
            onPress={() => setShowEmojiPicker((prev) => !prev)}
            disabled={isPending}
            activeOpacity={0.7}
            className="items-center justify-center pb-2.5 pr-3"
          >
            <Ionicons
              name="happy-outline"
              size={22}
              color={showEmojiPicker ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="items-center justify-center rounded-full ml-2"
          style={{
            width: 40,
            height: 40,
            backgroundColor: content.trim() || attachments.length > 0 ? colors.primary : colors.surface,
          }}
          onPress={handleSend}
          disabled={isPending || (!content.trim() && attachments.length === 0)}
        >
          <Ionicons
            name="send"
            size={20}
            color={content.trim() || attachments.length > 0 ? colors.background : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {showEmojiPicker && (
        <View className="flex-row flex-wrap mt-2 border-t border-border pt-2">
          {QUICK_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              className="w-9 h-9 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
