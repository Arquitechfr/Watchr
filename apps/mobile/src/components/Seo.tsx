import { Platform } from "react-native";
import { Helmet } from "react-helmet-async";
import { useI18n } from "../i18n/useI18n";

type SeoProps = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
};

const DEFAULT_IMAGE = "https://app.watchr.me/og-image.png";
const DEFAULT_URL = "https://app.watchr.me";

export function Seo({ title, description, image, url, type = "website" }: SeoProps) {
  const { t } = useI18n();

  if (Platform.OS !== "web") return null;

  const fullTitle = title ? `${title} | ${t("common.appName")}` : t("seo.defaultTitle");
  const metaDescription = description || t("seo.defaultDescription");
  const ogImage = image || DEFAULT_IMAGE;
  const canonicalUrl = url || DEFAULT_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
