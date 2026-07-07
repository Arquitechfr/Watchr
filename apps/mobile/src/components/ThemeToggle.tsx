import { TouchableOpacity, Text } from "react-native";
import { useTheme } from "../theme/useTheme";
import type { ThemePreference } from "../store/themeStore";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => setPreference(opt.value)}
          className={`px-3 py-1.5 rounded-md ${
            preference === opt.value ? "bg-primary" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              preference === opt.value ? "text-background" : "text-text-muted"
            }`}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );
}
