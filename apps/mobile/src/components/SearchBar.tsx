import { useEffect, useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onClose: () => void;
  minChars?: number;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder, onClose, minChars = 3, autoFocus = true }: SearchBarProps) {
  const colors = useThemeColors();
  const { t } = useI18n();
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeText(localValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [localValue]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const showTip = localValue.trim().length > 0 && localValue.trim().length < minChars;

  return (
    <View className="mb-3">
      <View className="flex-row items-center bg-surface rounded-lg px-3 py-2 border border-border">
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          className="flex-1 text-text ml-2 text-base"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={localValue}
          onChangeText={setLocalValue}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
        />
        <TouchableOpacity onPress={onClose} className="ml-2 p-1">
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {showTip && (
        <View className="mt-1.5 px-1">
          <Text className="text-text-muted text-xs">{t("screens.movies.minCharsTip")}</Text>
        </View>
      )}
    </View>
  );
}
