import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";

interface RatingStarsProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: number;
  label?: string;
}

export function RatingStars({ value, onChange, size = 20, label }: RatingStarsProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center">
      {label && <Text className="text-text-muted mr-3 text-sm">{label}</Text>}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
        const isFilled = value !== null && star <= value;
        return (
          <TouchableOpacity key={star} onPress={() => onChange(star)} className="mr-1">
            <Ionicons
              name={isFilled ? "star" : "star-outline"}
              size={size}
              color={isFilled ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
      {value !== null && (
        <Text className="text-primary ml-2 font-semibold">{value}/10</Text>
      )}
    </View>
  );
}
