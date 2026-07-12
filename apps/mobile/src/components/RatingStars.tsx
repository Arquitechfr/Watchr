import { View, Text, TouchableOpacity } from "react-native";
import { useThemeColors } from "../theme/useThemeColors";

interface RatingStarsProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: number;
  label?: string;
}

export function RatingStars({ value, onChange, label }: RatingStarsProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center">
      {label && <Text className="text-text-muted mr-3 text-sm">{label}</Text>}
      {[1, 2, 3, 4, 5].map((num) => {
        const isSelected = value !== null && num === value;
        const isHighlighted = value !== null && num <= value;
        return (
          <TouchableOpacity
            key={num}
            onPress={() => onChange(num)}
            className={`mr-1.5 px-3 py-2 rounded-lg ${
              isSelected
                ? "bg-primary"
                : isHighlighted
                  ? "bg-primary/20"
                  : "bg-background"
            }`}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text
              className={`font-bold text-lg ${
                isSelected
                  ? "text-white"
                  : isHighlighted
                    ? "text-primary"
                    : "text-text-muted"
              }`}
            >
              {num}
            </Text>
          </TouchableOpacity>
        );
      })}
      <Text className="text-text-muted text-sm ml-1" style={{ color: colors.textMuted }}>
        /5
      </Text>
    </View>
  );
}
