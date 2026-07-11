import { View, Text, ActivityIndicator, Modal } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";

interface LoadingOverlayProps {
  visible: boolean;
  label: string;
}

export function LoadingOverlay({ visible, label }: LoadingOverlayProps) {
  const colors = useThemeColors();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            paddingHorizontal: 32,
            paddingVertical: 24,
            alignItems: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-text text-sm">{label}</Text>
        </View>
      </View>
    </Modal>
  );
}
