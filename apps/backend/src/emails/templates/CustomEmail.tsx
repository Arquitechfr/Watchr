import { EmailLayout } from "../components/EmailLayout.js";
import { Button } from "@react-email/components";
import type { SupportedLocale } from "../../i18n/translations.js";

interface CustomEmailProps {
  innerHtml: string;
  locale?: SupportedLocale | string | undefined;
  previewText?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export function CustomEmail({ innerHtml, locale, previewText, ctaUrl, ctaLabel }: CustomEmailProps) {
  return (
    <EmailLayout locale={locale} previewText={previewText}>
      <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
      {ctaUrl && (
        <div style={{ textAlign: "center", marginTop: "28px", marginBottom: "8px" }}>
          <Button
            href={ctaUrl}
            className="email-cta"
            style={{
              backgroundColor: "#C65D3A",
              color: "#FFFFFF",
              borderRadius: "8px",
              padding: "14px 32px",
              fontSize: "1rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {ctaLabel ?? "Open in Watchr"}
          </Button>
        </div>
      )}
    </EmailLayout>
  );
}
