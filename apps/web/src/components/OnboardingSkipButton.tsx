import { useI18n } from "../i18n/useI18n";

interface OnboardingSkipButtonProps {
  onPress: () => void;
}

export function OnboardingSkipButton({ onPress }: OnboardingSkipButtonProps) {
  const { t } = useI18n();
  return (
    <button
      onClick={onPress}
      className="text-text-muted text-sm underline hover:text-text transition-colors py-2 px-4"
    >
      {t("screens.onboarding.skip")}
    </button>
  );
}
