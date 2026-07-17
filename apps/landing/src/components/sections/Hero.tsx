import { useTranslation } from "react-i18next";
import { Play, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import splashIcon from "@/assets/splash-icon.webp";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface to-background" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("hero.badge")}
          </div>

          {/* Title */}
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-text sm:text-5xl md:text-6xl lg:text-7xl">
            {t("hero.title")}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-base text-text-muted sm:text-lg md:text-xl">
            {t("hero.subtitle")}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="xl">
              <a href="https://play.google.com/store/apps/details?id=com.watchr.app">
                <Download className="mr-2 h-6 w-6" />
                {t("hero.ctaDownload")}
              </a>
            </Button>
            <Button asChild size="xl" variant="outline">
              <a href="https://app.watchr.me">
                <Play className="mr-2 h-6 w-6" />
                {t("hero.ctaWeb")}
              </a>
            </Button>
          </div>

          {/* Hero image / mockup */}
          <div className="mt-16 w-full max-w-md">
            <div className="relative mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-3xl" />
              <img
                src={splashIcon}
                alt="Watchr app"
                className="relative w-full rounded-3xl border border-border shadow-2xl"
                loading="eager"
                width={400}
                height={400}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
