import { Modal, View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { useUIStore } from "../store/uiStore";
import { useThemeColors } from "../theme/useThemeColors";
import { animations } from "../theme/animations";

export function CustomAlert() {
  const { alert, hideAlert } = useUIStore();
  const colors = useThemeColors();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (alert) {
      opacity.value = withTiming(1, { duration: animations.duration.normal, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, animations.easing.spring);
    } else {
      opacity.value = 0;
      scale.value = 0.9;
    }
  }, [alert]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!alert) return null;

  const triggerHaptic = (style?: "default" | "cancel" | "destructive") => {
    if (Platform.OS === "web") return;
    try {
      if (style === "destructive") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.selectionAsync();
    } catch {
      // Haptics not available
    }
  };

  const handlePress = (onPress?: () => void, buttonStyle?: "default" | "cancel" | "destructive") => {
    triggerHaptic(buttonStyle);
    hideAlert();
    onPress?.();
  };

  const handleRequestClose = () => {
    const cancelButton = alert.buttons.find((b) => b.style === "cancel");
    if (cancelButton) {
      handlePress(cancelButton.onPress, cancelButton.style);
    } else {
      const last = alert.buttons[alert.buttons.length - 1];
      if (last) handlePress(last.onPress, last.style);
    }
  };

  const getButtonColor = (style?: "default" | "cancel" | "destructive") => {
    if (style === "destructive") return colors.danger;
    if (style === "cancel") return colors.textMuted;
    return colors.primary;
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleRequestClose}>
      <Animated.View style={[{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 32 }, backdropStyle]}>
        <Animated.View style={[{ backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 360 }, dialogStyle]}>
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
                  onPress={() => handlePress(button.onPress, button.style)}
                  activeOpacity={0.6}
                >
                  <Text className="text-base font-medium" style={{ color: getButtonColor(button.style) }}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
