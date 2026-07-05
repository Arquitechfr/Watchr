import { TouchableOpacity, Text } from "react-native";
import { useI18n } from "../../i18n/useI18n";

interface OnboardingSkipButtonProps {
  onPress: () => void;
}

export function OnboardingSkipButton({ onPress }: OnboardingSkipButtonProps) {
  const { t } = useI18n();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="py-2 px-4">
      <Text className="text-text-muted text-sm underline">{t("screens.onboarding.skip")}</Text>
    </TouchableOpacity>
  );
}
