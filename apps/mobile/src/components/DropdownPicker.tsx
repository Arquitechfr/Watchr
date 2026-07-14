import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../theme/useThemeColors";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownPickerProps {
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export function DropdownPicker({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: DropdownPickerProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setVisible(false);
    },
    [onChange],
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 12,
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: selectedOption ? colors.text : colors.textMuted,
            fontSize: 15,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType={isDesktopWeb ? "fade" : "slide"} onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          className="flex-1"
          style={isDesktopWeb ? { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 } : { backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={isDesktopWeb ? {
              backgroundColor: colors.surface,
              borderRadius: 16,
              maxHeight: "60%",
              paddingBottom: 16,
              width: "100%",
              maxWidth: 400,
            } : {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "60%",
              paddingBottom: 32,
              marginBottom: 24,
              marginTop: "auto",
              width: "100%",
            }}
          >
            <View className="items-center pt-3 pb-2">
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.border,
                }}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleSelect(opt.value)}
                  className="px-4 py-3 flex-row items-center justify-between"
                  style={{
                    backgroundColor: opt.value === value ? colors.primary + "20" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: opt.value === value ? colors.primary : colors.text,
                      fontSize: 15,
                      flex: 1,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {opt.value === value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
