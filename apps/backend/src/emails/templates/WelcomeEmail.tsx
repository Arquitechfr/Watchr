import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout.js";
import { TipBox } from "../components/TipBox.js";
import { CtaButton } from "../components/CtaButton.js";
import { translateEmail } from "../../i18n/index.js";
import type { SupportedLocale } from "../../i18n/translations.js";

interface WelcomeEmailProps {
  locale: SupportedLocale | string | undefined;
  username: string;
}

export function WelcomeEmail({ locale, username }: WelcomeEmailProps) {
  const heading = translateEmail("welcomeHeading", locale);
  const body = translateEmail("welcomeBody", locale, { username });
  const cta = translateEmail("welcomeCta", locale);
  const tipUsername = translateEmail("welcomeTipUsername", locale, { username });
  const tipFeatures = translateEmail("welcomeTipFeatures", locale);
  const footer = translateEmail("welcomeFooter", locale);

  return (
    <EmailLayout locale={locale} previewText={heading}>
      <Heading className="email-heading" style={{
        color: "#2A2018",
        fontSize: "1.5rem",
        margin: "0 0 16px 0",
        fontWeight: 700,
      }}>
        {heading}
      </Heading>
      <Text className="email-body-text" style={{
        color: "#4A4239",
        fontSize: "1rem",
        lineHeight: "1.6",
        margin: "0 0 24px 0",
      }}>
        {body}
      </Text>
      <TipBox emoji="💡">{tipUsername}</TipBox>
      <TipBox emoji="✨">{tipFeatures}</TipBox>
      <div style={{ margin: "24px 0 0 0" }}>
        <CtaButton href="https://app.watchr.me">{cta}</CtaButton>
      </div>
      <Text className="email-footer" style={{
        color: "#7A6B5E",
        fontSize: "0.8rem",
        margin: "24px 0 0 0",
        lineHeight: "1.5",
      }}>
        {footer}
      </Text>
    </EmailLayout>
  );
}
