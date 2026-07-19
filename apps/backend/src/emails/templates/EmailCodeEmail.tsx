import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout.js";
import { TipBox } from "../components/TipBox.js";
import { CtaButton } from "../components/CtaButton.js";
import { translateEmail } from "../../i18n/index.js";
import type { SupportedLocale } from "../../i18n/translations.js";

interface EmailCodeEmailProps {
  locale: SupportedLocale | string | undefined;
  code: string;
  url: string;
}

export function EmailCodeEmail({ locale, code, url }: EmailCodeEmailProps) {
  const heading = translateEmail("emailCodeHeading", locale);
  const body = translateEmail("emailCodeBody", locale);
  const codeLabel = translateEmail("emailCodeLabel", locale);
  const cta = translateEmail("emailCodeCta", locale);
  const tipSecurity = translateEmail("emailCodeTipSecurity", locale);
  const footer = translateEmail("emailCodeFooter", locale);

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
      <Text className="email-body-text" style={{
        color: "#4A4239",
        fontSize: "0.9rem",
        lineHeight: "1.6",
        margin: "0 0 8px 0",
      }}>
        {codeLabel}
      </Text>
      <Text className="email-code" style={{
        color: "#2A2018",
        fontSize: "2.5rem",
        fontWeight: 700,
        letterSpacing: "0.5rem",
        margin: "0 0 24px 0",
        textAlign: "center",
      }}>
        {code}
      </Text>
      <div style={{ margin: "0 0 24px 0" }}>
        <CtaButton href={url}>{cta}</CtaButton>
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
