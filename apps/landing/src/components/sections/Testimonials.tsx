import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

const TESTIMONIAL_KEYS = ["one", "two", "three"] as const;

export function Testimonials() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("testimonials.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("testimonials.subtitle")}
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            "mt-16 grid grid-cols-1 gap-6 md:grid-cols-3",
            isVisible && "animate-fade-in-up",
          )}
        >
          {TESTIMONIAL_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              {/* Stars */}
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-primary text-primary"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed text-text">
                "{t(`testimonials.items.${key}.quote`)}"
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {t(`testimonials.items.${key}.name`).charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">
                    {t(`testimonials.items.${key}.name`)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {t(`testimonials.items.${key}.role`)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
