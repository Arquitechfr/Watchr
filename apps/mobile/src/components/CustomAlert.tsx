import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useUIStore } from "../store/uiStore";
import { useThemeColors } from "../theme/useThemeColors";

export function CustomAlert() {
  const { alert, hideAlert } = useUIStore();
  const colors = useThemeColors();

  if (!alert) return null;

  const handlePress = (onPress?: () => void) => {
    hideAlert();
    onPress?.();
  };

  const handleRequestClose = () => {
    const cancelButton = alert.buttons.find((b) => b.style === "cancel");
    if (cancelButton) {
      handlePress(cancelButton.onPress);
    } else {
      const last = alert.buttons[alert.buttons.length - 1];
      if (last) handlePress(last.onPress);
    }
  };

  const getButtonColor = (style?: "default" | "cancel" | "destructive") => {
    if (style === "destructive") return colors.danger;
    if (style === "cancel") return colors.textMuted;
    return colors.primary;
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View className="flex-1 justify-center items-center bg-black/70 px-8">
        <View className="bg-surface rounded-2xl overflow-hidden w-full max-w-sm">
          <View className="px-5 pt-5 pb-4">
            <Text className="text-text text-lg font-semibold text-center mb-1.5">{alert.title}</Text>
            {alert.message ? (
              <Text className="text-text-muted text-sm text-center">{alert.message}</Text>
            ) : null}
          </View>

          <View className="border-t border-border" />

          <ScrollView>
            {alert.buttons.map((button, index) => (
              <View key={index}>
                {index > 0 && <View className="h-px bg-border" />}
                <TouchableOpacity
                  className="py-3.5 px-5 items-center"
                  onPress={() => handlePress(button.onPress)}
                  activeOpacity={0.6}
                >
                  <Text className="text-base font-medium" style={{ color: getButtonColor(button.style) }}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
