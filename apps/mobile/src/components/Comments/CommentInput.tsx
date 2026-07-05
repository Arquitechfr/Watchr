import { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";
import { useUIStore } from "../../store/uiStore";
import { uploadCommentImage } from "../../services/upload.service";
import { useErrorMessage } from "../../services/api";

interface CommentInputProps {
  placeholder?: string;
  initialValue?: string;
  initialImages?: string[];
  submitLabel?: string;
  isPending?: boolean;
  onSubmit: (content: string, images?: string[]) => void;
  onCancel?: () => void;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "👏", "🤔", "😢", "😡", "🎉"];

export function CommentInput({
  placeholder,
  initialValue = "",
  initialImages = [],
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: CommentInputProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { showSnackbar } = useUIStore();
  const getErrorMessage = useErrorMessage();
  const [content, setContent] = useState(initialValue);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>(initialImages);
  const [uploadingCount, setUploadingCount] = useState(0);

  const MAX_IMAGES = 3;

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedImages.length > 0 ? selectedImages : undefined);
    setContent("");
    setSelectedImages([]);
    setShowEmojiPicker(false);
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  async function pickImages() {
    if (selectedImages.length >= MAX_IMAGES) {
      showSnackbar(t("screens.comments.maxImages"), "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const remaining = MAX_IMAGES - selectedImages.length;
    const assets = result.assets.slice(0, remaining);

    setUploadingCount(assets.length);
    const uploaded: string[] = [];
    for (const asset of assets) {
      try {
        const file = {
          uri: asset.uri,
          type: asset.mimeType ?? "image/jpeg",
          name: `image.${(asset.mimeType ?? "image/jpeg").split("/")[1]}`,
        };
        const { url } = await uploadCommentImage(file);
        uploaded.push(url);
      } catch (error) {
        showSnackbar(getErrorMessage(error), "error");
      }
    }
    setUploadingCount(0);
    if (uploaded.length > 0) {
      setSelectedImages((prev) => [...prev, ...uploaded]);
    }
  }

  function removeImage(idx: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
  }

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
          onPress={pickImages}
          disabled={isPending || uploadingCount > 0 || selectedImages.length >= MAX_IMAGES}
          className="mr-3 p-1"
          activeOpacity={0.7}
        >
          {uploadingCount > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          )}
        </TouchableOpacity>
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
      {selectedImages.length > 0 && (
        <View className="flex-row flex-wrap mt-2 border-t border-border pt-2">
          {selectedImages.map((img, idx) => (
            <View key={idx} className="relative mr-2 mb-2">
              <Image
                source={{ uri: img }}
                style={{ width: 80, height: 80, borderRadius: 8 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                className="absolute -top-1 -right-1 items-center justify-center rounded-full"
                style={{ width: 20, height: 20, backgroundColor: colors.danger }}
              >
                <Ionicons name="close" size={12} color={colors.text} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
