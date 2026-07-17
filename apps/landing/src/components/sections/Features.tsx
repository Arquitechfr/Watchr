import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Star,
  MessageSquare,
  Search,
  Newspaper,
  Users,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

const FEATURE_ICONS = {
  tracking: CheckCircle2,
  ratings: Star,
  comments: MessageSquare,
  search: Search,
  news: Newspaper,
  social: Users,
} as const;

const FEATURE_KEYS = [
  "tracking",
  "ratings",
  "comments",
  "search",
  "news",
  "social",
] as const;

export function Features() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("features.subtitle")}
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            "mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
            isVisible && "animate-fade-in-up",
          )}
        >
          {FEATURE_KEYS.map((key) => {
            const Icon = FEATURE_ICONS[key];
            return (
              <div
                key={key}
                className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {t(`features.items.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
