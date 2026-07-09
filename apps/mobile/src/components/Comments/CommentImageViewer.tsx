import { Modal, View, TouchableOpacity, Image, ScrollView, Dimensions, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../theme/useThemeColors";
import { useI18n } from "../../i18n/useI18n";

interface CommentImageViewerProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export function CommentImageViewer({ visible, imageUri, onClose }: CommentImageViewerProps) {
  const colors = useThemeColors();
  const { t } = useI18n();

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
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
            resizeMode="contain"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
