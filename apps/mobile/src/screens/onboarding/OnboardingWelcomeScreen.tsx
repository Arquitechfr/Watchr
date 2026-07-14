import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { OnboardingSkipButton } from "./OnboardingSkipButton";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { Seo } from "../../components/Seo";
import { usePostHog } from "posthog-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSelection: undefined;
  OnboardingImport: undefined;
};

interface OnboardingWelcomeScreenProps {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "OnboardingWelcome">;
  onSkip: () => void;
}

export function OnboardingWelcomeScreen({ navigation, onSkip }: OnboardingWelcomeScreenProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture("onboarding_welcome_viewed");
  }, [posthog]);

  const handleSkip = () => {
    posthog?.capture("onboarding_skipped_from_welcome");
    onSkip();
  };

  return (
    <ScreenContainer>
      <Seo title={t("seo.onboarding")} />
      <View className="flex-1 items-center justify-center px-6 md:max-w-md md:mx-auto w-full">
        <Text className="text-text text-3xl font-bold text-center mb-4">
          {t("screens.onboarding.welcomeTitle")}
        </Text>
        <Text className="text-text-muted text-center text-base mb-12">
          {t("screens.onboarding.welcomeSubtitle")}
        </Text>
        <TouchableOpacity
          className="bg-primary px-8 py-4 rounded-lg w-full items-center"
          onPress={() => navigation.navigate("OnboardingSelection")}
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold text-lg">
            {t("screens.onboarding.welcomeStart")}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="items-center pb-4">
        <OnboardingSkipButton onPress={handleSkip} />
      </View>
    </ScreenContainer>
  );
}
