import { useTranslation } from "react-i18next";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useParallax } from "@/hooks/useParallax";
import { cn } from "@/lib/utils";

const STAT_KEYS = ["shows", "users", "ratings", "languages"] as const;

export function Stats() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const bgParallax = useParallax<HTMLDivElement>({ speed: 0.1 });

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-surface/50">
      {/* Parallax background glow */}
      <div
        ref={bgParallax.ref}
        style={bgParallax.style}
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("stats.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("stats.subtitle")}
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            "mt-16 grid grid-cols-2 gap-8 lg:grid-cols-4",
            isVisible && "animate-fade-in-up",
          )}
        >
          {STAT_KEYS.map((key) => (
            <div key={key} className="text-center">
              <div className="text-4xl font-bold text-primary sm:text-5xl">
                {t(`stats.items.${key}.value`)}
              </div>
              <div className="mt-2 text-sm text-text-muted">
                {t(`stats.items.${key}.label`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
