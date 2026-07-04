import { View, Text, Linking, TouchableOpacity } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useI18n } from "../../i18n/useI18n";
import { colors } from "../../theme/colors";
import Constants from "expo-constants";

export function ProfileAboutScreen() {
  const { t } = useI18n();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <View className="items-center mb-8 mt-4">
        <Text className="text-3xl font-bold text-primary mb-2">Watchr</Text>
        <Text className="text-text-muted text-sm">
          {t("screens.profile.aboutVersion")} {version}
        </Text>
      </View>

      <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
        <Text className="text-text text-base leading-relaxed">
          {t("screens.profile.aboutDescription")}
        </Text>
      </View>

      <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
        <Text className="text-text-muted text-sm leading-relaxed">
          {t("screens.profile.aboutCredits")}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL("https://github.com/norsecoder/watchr")}
        className="rounded-lg p-4"
        style={{ backgroundColor: colors.surface }}
      >
        <Text className="text-primary text-base text-center">GitHub</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
