import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { hapticLight } from "../utils/haptics";

interface RatingStarsProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: number;
  label?: string;
}

export function RatingStars({ value, onChange, size = 26, label }: RatingStarsProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center">
      {label && <Text className="text-text-muted mr-3 text-sm">{label}</Text>}
      {[1, 2, 3, 4, 5].map((num) => {
        const filled = value !== null && num <= value;
        return (
          <TouchableOpacity
            key={num}
            onPress={() => { hapticLight(); onChange(num); }}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            className="mr-1.5"
            activeOpacity={0.6}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
