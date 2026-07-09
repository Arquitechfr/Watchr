import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function MenuCard({ icon, label, onPress }: MenuCardProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      className="flex-row items-center rounded-lg p-4 mb-3"
      style={{ backgroundColor: colors.surface }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text className="text-text text-base flex-1 ml-3">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ProfileDataScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <View style={Platform.OS === "web" ? { maxWidth: 600, alignSelf: "center", width: "100%" } : undefined}>
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-text text-xl font-bold">{t("screens.profile.myData")}</Text>
      </View>

      <MenuCard
        icon="download"
        label={t("screens.profile.importData")}
        onPress={() => navigation.navigate("Import")}
      />
      <MenuCard
        icon="cloud-upload-outline"
        label={t("screens.profile.exportData")}
        onPress={() => navigation.navigate("Export")}
      />
      </View>
    </ScreenContainer>
  );
}
