import { Html, Head, Body, Container, Section, Text, Img, Preview } from "@react-email/components";
import type { ReactNode } from "react";
import { normalizeLocale, type SupportedLocale } from "../../i18n/translations.js";
import { env } from "../../config/env.js";

interface EmailLayoutProps {
  children: ReactNode;
  locale?: SupportedLocale | string | undefined;
  previewText?: string;
}

export function EmailLayout({ children, locale, previewText }: EmailLayoutProps) {
  const lang = normalizeLocale(locale);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const logoUrl = `${env.PUBLIC_URL}/assets/icon.png`;
  const year = new Date().getFullYear();

  return (
    <Html lang={lang} dir={dir}>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>Watchr</title>
        <style>{`
          /* Light mode (default) */
          .email-body { background-color: #FAF6F2 !important; }
          .email-card { background-color: #FFFFFF !important; }
          .email-header { background-color: #C65D3A !important; }
          .email-heading { color: #2A2018 !important; }
          .email-body-text { color: #4A4239 !important; }
          .email-footer { color: #7A6B5E !important; }
          .email-cta { background-color: #C65D3A !important; color: #FFFFFF !important; }
          .email-copyright { color: #7A6B5E !important; }
          .email-tip { background-color: #F0EAE3 !important; border-left: 3px solid #C65D3A !important; color: #4A4239 !important; }
          .email-code { color: #2A2018 !important; }
          .email-divider { border-color: #D4C9BE !important; }

          /* Dark mode override */
          @media (prefers-color-scheme: dark) {
            .email-body { background-color: #1A1614 !important; }
            .email-card { background-color: #252019 !important; }
            .email-header { background-color: #C65D3A !important; }
            .email-heading { color: #F5F0EB !important; }
            .email-body-text { color: #A89B91 !important; }
            .email-footer { color: #A89B91 !important; }
            .email-cta { background-color: #C65D3A !important; color: #F5F0EB !important; }
            .email-copyright { color: #A89B91 !important; }
            .email-tip { background-color: #332C24 !important; border-left: 3px solid #C65D3A !important; color: #A89B91 !important; }
            .email-code { color: #F5F0EB !important; }
            .email-divider { border-color: #3D352D !important; }
          }

          /* Gmail App dark mode */
          u + .email-body .email-card { background-color: #252019 !important; }
          u + .email-body .email-heading { color: #F5F0EB !important; }
          u + .email-body .email-body-text { color: #A89B91 !important; }
          u + .email-body .email-tip { background-color: #332C24 !important; color: #A89B91 !important; }
          u + .email-body .email-code { color: #F5F0EB !important; }

          /* Outlook.com webmail dark mode */
          [data-ogsb] .email-body { background-color: #1A1614 !important; }
          [data-ogsb] .email-card { background-color: #252019 !important; }
          [data-ogsb] .email-heading { color: #F5F0EB !important; }
          [data-ogsb] .email-body-text { color: #A89B91 !important; }
          [data-ogsb] .email-footer { color: #A89B91 !important; }
          [data-ogsb] .email-cta { background-color: #C65D3A !important; color: #F5F0EB !important; }
          [data-ogsb] .email-copyright { color: #A89B91 !important; }
          [data-ogsb] .email-tip { background-color: #332C24 !important; border-left: 3px solid #C65D3A !important; color: #A89B91 !important; }
          [data-ogsb] .email-code { color: #F5F0EB !important; }
          [data-ogsb] .email-divider { border-color: #3D352D !important; }

          /* Responsive */
          @media (max-width: 600px) {
            .email-card { width: 100% !important; }
            .email-card-inner { padding: 24px 20px !important; }
          }
        `}</style>
      </Head>
      <Body className="email-body" style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#FAF6F2",
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        WebkitTextSizeAdjust: "100%",
      }}>
        {previewText && <Preview>{previewText}</Preview>}
        <Container className="email-body" style={{
          backgroundColor: "#FAF6F2",
          minHeight: "100vh",
          padding: "40px 16px",
        }}>
          <Container className="email-card" style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            maxWidth: "540px",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}>
            <Section className="email-header" style={{
              backgroundColor: "#C65D3A",
              padding: "20px 40px",
              textAlign: "center",
            }}>
              <Img
                src={logoUrl}
                alt="Watchr"
                width="40"
                height="40"
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  borderRadius: "8px",
                }}
              />
              <span style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginLeft: "10px",
                color: "#FFFFFF",
                fontSize: "1.2rem",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}>
                Watchr
              </span>
            </Section>
            <Container className="email-card-inner" style={{
              padding: "36px 40px",
              backgroundColor: "transparent",
            }}>
              {children}
            </Container>
          </Container>
          <Text className="email-copyright" style={{
            color: "#7A6B5E",
            fontSize: "0.8rem",
            marginTop: "24px",
            textAlign: "center",
          }}>
            Watchr &copy; {year}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
