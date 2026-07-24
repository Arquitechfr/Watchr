import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SubScreenHeader } from "../../components/SubScreenHeader";
import { Seo } from "../../components/Seo";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SubscriptionSuccessScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("screens.subscription.successTitle")} />
      <SubScreenHeader title={t("screens.subscription.successTitle")} />
      <View className="md:max-w-lg md:mx-auto w-full items-center justify-center flex-1">
        <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.primary }}>
          <Ionicons name="checkmark" size={40} color={colors.background} />
        </View>
        <Text className="text-text text-xl font-bold text-center mb-2">{t("screens.subscription.successTitle")}</Text>
        <Text className="text-text-muted text-base text-center mb-8">{t("screens.subscription.successMessage")}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Main", { screen: "Profile" })}
          className="rounded-lg px-6 py-3"
          style={{ backgroundColor: colors.primary }}
          activeOpacity={0.7}
        >
          <Text className="text-background font-semibold">{t("screens.subscription.backToProfile")}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
