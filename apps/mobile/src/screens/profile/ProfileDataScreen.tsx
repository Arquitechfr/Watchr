import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { Seo } from "../../components/Seo";

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
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.profileData")} />
      <SubScreenHeader title={t("screens.profile.myData")} />

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
    </ScreenContainer>
  );
}
