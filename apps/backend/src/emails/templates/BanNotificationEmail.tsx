import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout.js";
import { TipBox } from "../components/TipBox.js";
import { translateEmail } from "../../i18n/index.js";
import type { SupportedLocale } from "../../i18n/translations.js";

interface BanNotificationEmailProps {
  locale: SupportedLocale | string | undefined;
  username: string;
  action: string;
  reason: string;
  effectiveDate: string;
  suspendedUntil?: string;
}

export function BanNotificationEmail({
  locale,
  username,
  action,
  reason,
  effectiveDate,
  suspendedUntil,
}: BanNotificationEmailProps) {
  const heading = translateEmail("banHeading", locale);
  const body = translateEmail("banBody", locale, {
    username,
    action,
    reason,
    effectiveDate,
  });
  const footer = translateEmail("banFooter", locale);
  const tipAppeal = translateEmail("banTipAppeal", locale);

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
      {suspendedUntil && (
        <Text className="email-body-text" style={{
          color: "#4A4239",
          fontSize: "0.95rem",
          lineHeight: "1.6",
          margin: "16px 0 0 0",
        }}>
          {translateEmail("banSuspendedUntil", locale, { date: suspendedUntil })}
        </Text>
      )}
      <TipBox emoji="️">{tipAppeal}</TipBox>
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
