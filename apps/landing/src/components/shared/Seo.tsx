import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
}

export function Seo({ title, description, image }: SeoProps) {
  const { t, i18n } = useTranslation();

  const pageTitle = title ?? t("hero.title");
  const pageDescription = description ?? t("hero.subtitle");
  const pageImage = image ?? "https://watchr.me/og-image.png";
  const currentLang = i18n.language?.split("-")[0] ?? "en";

  return (
    <Helmet>
      <html lang={currentLang} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href="https://watchr.me" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Watchr" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content="https://watchr.me" />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />

      {/* hreflang */}
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`https://watchr.me/${lang === "en" ? "" : lang}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href="https://watchr.me" />

      {/* JSON-LD: WebSite */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Watchr",
          url: "https://watchr.me",
          description: pageDescription,
          potentialAction: {
            "@type": "SearchAction",
            target: "https://app.watchr.me/main/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        })}
      </script>

      {/* JSON-LD: SoftwareApplication */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Watchr",
          applicationCategory: "EntertainmentApplication",
          operatingSystem: "Android, Web",
          url: "https://watchr.me",
          description: pageDescription,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "1200",
          },
        })}
      </script>

      {/* JSON-LD: FAQPage */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            "free",
            "import",
            "platforms",
            "privacy",
            "account",
            "web",
            "languages",
          ].map((key) => ({
            "@type": "Question",
            name: t(`faq.items.${key}.question`),
            acceptedAnswer: {
              "@type": "Answer",
              text: t(`faq.items.${key}.answer`),
            },
          })),
        })}
      </script>
    </Helmet>
  );
}
