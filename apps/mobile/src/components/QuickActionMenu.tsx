import { Modal, View, Text, TouchableOpacity, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { hapticMedium } from "../utils/haptics";

export interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}

interface QuickActionMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: QuickAction[];
}

export function QuickActionMenu({ visible, onClose, title, actions }: QuickActionMenuProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end" onPress={onClose}>
        <View className="flex-1 bg-black/40" />
        <Pressable
          className="bg-surface rounded-t-2xl px-4 pb-8 pt-3"
          style={{ paddingBottom: Platform.OS === "web" ? 24 : 40 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="w-10 h-1 bg-text-muted/30 rounded-full self-center mb-4" />

          {title && (
            <Text
              style={{ fontFamily: "Outfit_700Bold", fontSize: 16 }}
              className="text-text mb-4 text-center"
              numberOfLines={1}
            >
              {title}
            </Text>
          )}

          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center py-3.5 px-2 rounded-lg active:bg-surface-light"
              onPress={() => {
                hapticMedium();
                action.onPress();
                onClose();
              }}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={action.destructive ? colors.danger : action.color ?? colors.text}
              />
              <Text
                className={`ml-3 text-base ${action.destructive ? "text-danger" : "text-text"}`}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
