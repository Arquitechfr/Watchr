import { useEffect } from "react";
import { Platform } from "react-native";
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

function upsertMeta(attr: string, key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function Seo({ title, description, image, url, type = "website" }: SeoProps) {
  const { t } = useI18n();

  const fullTitle = title ? `${title} | ${t("common.appName")}` : t("seo.defaultTitle");
  const metaDescription = description || t("seo.defaultDescription");
  const ogImage = image || DEFAULT_IMAGE;
  const canonicalUrl = url || DEFAULT_URL;

  useEffect(() => {
    if (Platform.OS !== "web") return;

    document.title = fullTitle;

    upsertMeta("name", "description", metaDescription ?? "");
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:title", fullTitle ?? "");
    upsertMeta("property", "og:description", metaDescription ?? "");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle ?? "");
    upsertMeta("name", "twitter:description", metaDescription ?? "");
    upsertMeta("name", "twitter:image", ogImage);

    upsertLink("canonical", canonicalUrl);
  }, [fullTitle, metaDescription, ogImage, canonicalUrl, type]);

  return null;
}
