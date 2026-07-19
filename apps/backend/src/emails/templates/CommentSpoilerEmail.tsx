import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout.js";
import { TipBox } from "../components/TipBox.js";
import { translateEmail } from "../../i18n/index.js";
import type { SupportedLocale } from "../../i18n/translations.js";

interface CommentSpoilerEmailProps {
  locale: SupportedLocale | string | undefined;
  username: string;
  showTitle: string;
}

export function CommentSpoilerEmail({ locale, username, showTitle }: CommentSpoilerEmailProps) {
  const heading = translateEmail("commentSpoilerHeading", locale);
  const body = translateEmail("commentSpoilerBody", locale, {
    username,
    show: showTitle,
  });
  const tip = translateEmail("commentSpoilerTip", locale);
  const footer = translateEmail("commentSpoilerFooter", locale);

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
      <TipBox emoji="💡">{tip}</TipBox>
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
