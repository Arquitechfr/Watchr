import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";

const MOODS = [
  { key: "happy", icon: "happy-outline" as const },
  { key: "sad", icon: "sad-outline" as const },
  { key: "excited", icon: "flash-outline" as const },
  { key: "relaxed", icon: "leaf-outline" as const },
  { key: "bored", icon: "hourglass-outline" as const },
  { key: "romantic", icon: "heart-outline" as const },
];

interface MoodPickerProps {
  selectedMood: string | null;
  onSelectMood: (mood: string) => void;
}

export function MoodPicker({ selectedMood, onSelectMood }: MoodPickerProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View className="mb-4">
      <Text className="text-text font-semibold text-base mb-3">
        {t("screens.discover.moodTitle")}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.key;
          return (
            <TouchableOpacity
              key={mood.key}
              onPress={() => onSelectMood(mood.key)}
              activeOpacity={0.7}
              className="flex-row items-center px-4 py-2.5 rounded-full"
              style={{
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
              }}
            >
              <Ionicons
                name={mood.icon}
                size={16}
                color={isSelected ? "#fff" : colors.text}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ color: isSelected ? "#fff" : colors.text }}
                className="text-sm font-medium"
              >
                {t(`screens.discover.moods.${mood.key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
