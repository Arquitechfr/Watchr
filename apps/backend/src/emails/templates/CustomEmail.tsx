import { EmailLayout } from "../components/EmailLayout.js";
import type { SupportedLocale } from "../../i18n/translations.js";

interface CustomEmailProps {
  innerHtml: string;
  locale?: SupportedLocale | string | undefined;
  previewText?: string;
}

export function CustomEmail({ innerHtml, locale, previewText }: CustomEmailProps) {
  return (
    <EmailLayout locale={locale} previewText={previewText}>
      <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </EmailLayout>
  );
}
