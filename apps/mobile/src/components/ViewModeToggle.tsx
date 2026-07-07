import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUIStore } from "../store/uiStore";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";

export function ViewModeToggle() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);
  const setLibraryViewMode = useUIStore((state) => state.setLibraryViewMode);

  return (
    <View className="flex-row bg-muted rounded-lg p-1">
      <TouchableOpacity
        onPress={() => setLibraryViewMode("list")}
        className={`p-1.5 rounded-md ${libraryViewMode === "list" ? "bg-primary" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={t("screens.library.listView")}
      >
        <Ionicons name="list" size={18} color={libraryViewMode === "list" ? colors.background : colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setLibraryViewMode("grid")}
        className={`p-1.5 rounded-md ml-1 ${libraryViewMode === "grid" ? "bg-primary" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={t("screens.library.gridView")}
      >
        <Ionicons name="grid" size={18} color={libraryViewMode === "grid" ? colors.background : colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
