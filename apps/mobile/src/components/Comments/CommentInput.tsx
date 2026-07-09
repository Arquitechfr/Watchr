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
  initialIsSpoiler?: boolean;
  submitLabel?: string;
  isPending?: boolean;
  onSubmit: (content: string, images?: string[], isSpoiler?: boolean) => void;
  onCancel?: () => void;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "👏", "🤔", "😢", "😡", "🎉"];

export function CommentInput({
  placeholder,
  initialValue = "",
  initialImages = [],
  initialIsSpoiler = false,
  submitLabel: _submitLabel,
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
  const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);

  const MAX_IMAGES = 3;

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedImages.length > 0 ? selectedImages : undefined, isSpoiler);
    setContent("");
    setSelectedImages([]);
    setShowEmojiPicker(false);
    setIsSpoiler(false);
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
    <View className="bg-surface-light rounded-2xl px-3 py-2.5">
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder={placeholder ?? t("screens.comments.placeholder")}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
        className="text-text min-h-[44px] text-sm leading-relaxed pb-2"
        editable={!isPending}
      />

      {selectedImages.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          {selectedImages.map((img, idx) => (
            <View key={idx} className="relative">
              <Image
                source={{ uri: img }}
                style={{ width: 70, height: 70, borderRadius: 10 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 items-center justify-center rounded-full"
                style={{ width: 22, height: 22, backgroundColor: colors.danger }}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={pickImages}
            disabled={isPending || uploadingCount > 0 || selectedImages.length >= MAX_IMAGES}
            activeOpacity={0.7}
          >
            {uploadingCount > 0 ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowEmojiPicker((prev) => !prev)}
            disabled={isPending}
            activeOpacity={0.7}
          >
            <Ionicons name="happy-outline" size={20} color={showEmojiPicker ? colors.primary : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSpoiler((prev) => !prev)}
            disabled={isPending}
            activeOpacity={0.7}
            className={`flex-row items-center px-2 py-1 rounded-full ${isSpoiler ? "bg-danger/15" : ""}`}
          >
            <Ionicons
              name={isSpoiler ? "eye-off" : "eye-off-outline"}
              size={16}
              color={isSpoiler ? colors.danger : colors.textMuted}
            />
            {isSpoiler && (
              <Text className="text-danger text-xs font-semibold ml-1">{t("screens.comments.spoiler")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-text-muted text-xs">{content.length}/2000</Text>
          {onCancel && (
            <TouchableOpacity onPress={onCancel} disabled={isPending} activeOpacity={0.7}>
              <Text className="text-text-muted text-sm">{t("common.cancel")}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isPending || !content.trim()}
            activeOpacity={0.7}
            className="items-center justify-center rounded-full"
            style={{
              width: 34,
              height: 34,
              backgroundColor: content.trim() ? colors.primary : colors.surface,
            }}
          >
            <Ionicons name="send" size={16} color={content.trim() ? "#fff" : colors.textMuted} />
          </TouchableOpacity>
        </View>
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
