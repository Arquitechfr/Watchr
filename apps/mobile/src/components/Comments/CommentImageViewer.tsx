import { Modal, View, TouchableOpacity, Image, ScrollView, useWindowDimensions, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n/useI18n";

interface CommentImageViewerProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export function CommentImageViewer({ visible, imageUri, onClose }: CommentImageViewerProps) {
  const { t } = useI18n();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const imageSize = Math.min(screenWidth, screenHeight);

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/90">
        <View className="flex-row items-center justify-between px-4 pt-12 pb-3">
          <Text className="text-white/60 text-sm">{t("screens.comments.tapToClose")}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-2">
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          maximumZoomScale={3}
          minimumZoomScale={1}
          bouncesZoom
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: imageSize, height: imageSize }}
            resizeMode="contain"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
