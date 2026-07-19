import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout.js";
import { TipBox } from "../components/TipBox.js";
import { CtaButton } from "../components/CtaButton.js";
import { translateEmail } from "../../i18n/index.js";
import type { SupportedLocale } from "../../i18n/translations.js";

interface ResetPasswordEmailProps {
  locale: SupportedLocale | string | undefined;
  resetUrl: string;
}

export function ResetPasswordEmail({ locale, resetUrl }: ResetPasswordEmailProps) {
  const heading = translateEmail("resetPasswordHeading", locale);
  const body = translateEmail("resetPasswordBody", locale);
  const cta = translateEmail("resetPasswordCta", locale);
  const tipSecurity = translateEmail("resetPasswordTipSecurity", locale);
  const footer = translateEmail("resetPasswordFooter", locale);

  const normalizedUrl = resetUrl.replace(/^watchr:\/\//, "https://app.watchr.me/");

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
      <div style={{ margin: "0 0 24px 0" }}>
        <CtaButton href={normalizedUrl}>{cta}</CtaButton>
      </div>
      <TipBox emoji="🔒">{tipSecurity}</TipBox>
      <Text className="email-footer" style={{
        color: "#7A6B5E",
        fontSize: "0.85rem",
        margin: "24px 0 0 0",
        lineHeight: "1.5",
      }}>
        {footer}
      </Text>
    </EmailLayout>
  );
}
