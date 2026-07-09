import { useState } from "react";
import { View, TouchableOpacity, Text, Modal, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocaleStore } from "../store/localeStore";
import { useChangeLocale } from "../hooks/useChangeLocale";
import { useTheme } from "../theme/useTheme";
import { SUPPORTED_LOCALES, LANG_FLAGS } from "../i18n/translations";
import type { ThemePreference } from "../store/themeStore";
import { useThemeColors } from "../theme/useThemeColors";

export function AuthSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const changeLocale = useChangeLocale();
  const { preference, setPreference } = useTheme();
  const colors = useThemeColors();

  const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: "system", label: "Auto" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className="p-2 rounded-full bg-surface shadow-sm"
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="w-full bg-surface rounded-xl overflow-hidden">
                <View className="p-4 border-b border-border">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="globe-outline" size={16} color={colors.text} />
                    <Text className="text-text font-semibold ml-2">Language</Text>
                  </View>
                  <View className="flex-row gap-2">
                    {SUPPORTED_LOCALES.map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        onPress={() => {
                          setLocale(lang);
                          changeLocale(lang);
                          setIsOpen(false);
                        }}
                        className={`flex-1 py-2 rounded-md items-center ${
                          locale === lang ? "bg-primary" : "bg-surface-light"
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-lg ${
                            locale === lang ? "text-background" : "text-text-muted"
                          }`}
                        >
                          {LANG_FLAGS[lang] || lang.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="moon-outline" size={16} color={colors.text} />
                    <Text className="text-text font-semibold ml-2">Theme</Text>
                  </View>
                  <View className="flex-col gap-2">
                    {THEME_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => {
                          setPreference(opt.value);
                          setIsOpen(false);
                        }}
                        className={`py-3 px-4 rounded-md flex-row justify-between items-center ${
                          preference === opt.value ? "bg-primary" : "bg-surface-light"
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            preference === opt.value ? "text-background" : "text-text-muted"
                          }`}
                        >
                          {opt.label}
                        </Text>
                        {preference === opt.value && (
                          <Ionicons name="checkmark" size={16} color={colors.background} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
