import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { OnboardingSkipButton } from "../../components/OnboardingSkipButton";
import { useI18n } from "../../i18n/useI18n";

export function OnboardingWelcomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSkip = () => {
    navigate("/series");
  };

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-text font-bold text-3xl text-center mb-4">
          {t("screens.onboarding.welcomeTitle")}
        </h1>
        <p className="text-text-muted text-center text-base mb-12">
          {t("screens.onboarding.welcomeSubtitle")}
        </p>
        <button
          onClick={() => navigate("/onboarding/selection")}
          className="bg-primary text-background px-8 py-4 rounded-lg w-full font-semibold text-lg hover:bg-primary-dark transition-colors"
        >
          {t("screens.onboarding.welcomeStart")}
        </button>
      </div>

      <div className="flex justify-center pb-4">
        <OnboardingSkipButton onPress={handleSkip} />
      </div>
    </PageWrapper>
  );
}
