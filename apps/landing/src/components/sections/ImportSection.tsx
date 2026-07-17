import { useTranslation } from "react-i18next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

const PLATFORM_KEYS = ["tvtime", "trakt", "imdb", "letterboxd"] as const;

const PLATFORM_EMOJIS: Record<(typeof PLATFORM_KEYS)[number], string> = {
  tvtime: "📺",
  trakt: "🎬",
  imdb: "⭐",
  letterboxd: "🎞️",
};

export function ImportSection() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="import" className="py-20 sm:py-28 bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("importSection.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("importSection.subtitle")}
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            "mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4",
            isVisible && "animate-fade-in-up",
          )}
        >
          {PLATFORM_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-2xl border border-border bg-surface p-6 text-center transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-light text-3xl mx-auto">
                {PLATFORM_EMOJIS[key]}
              </div>
              <h3 className="text-lg font-semibold text-text">
                {t(`importSection.platforms.${key}.name`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {t(`importSection.platforms.${key}.description`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Button asChild size="lg">
            <a href="https://app.watchr.me">
              {t("importSection.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
          <p className="flex items-center gap-2 text-xs text-text-muted">
            <ShieldCheck className="h-4 w-4 text-success" />
            {t("importSection.note")}
          </p>
        </div>
      </div>
    </section>
  );
}
