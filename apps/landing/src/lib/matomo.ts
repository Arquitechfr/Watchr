const MATOMO_URL = import.meta.env.VITE_MATOMO_URL;
const MATOMO_SITE_ID = import.meta.env.VITE_MATOMO_SITE_ID;

let initialized = false;

declare global {
  interface Window {
    _paq?: unknown[];
  }
}

export function initMatomo(): void {
  if (initialized || !MATOMO_URL || !MATOMO_SITE_ID) return;
  initialized = true;

  const _paq = (window._paq = window._paq || []);
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);
  _paq.push(["setTrackerUrl", `${MATOMO_URL}/matomo.php`]);
  _paq.push(["setSiteId", MATOMO_SITE_ID]);

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.defer = true;
  script.src = `${MATOMO_URL}/matomo.js`;
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
}

export function trackPageView(url: string): void {
  if (!initialized || !window._paq) return;
  window._paq.push(["setCustomUrl", url]);
  window._paq.push(["trackPageView"]);
}

export function isMatomoEnabled(): boolean {
  return initialized;
}
