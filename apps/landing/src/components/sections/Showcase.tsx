import { useTranslation } from "react-i18next";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import libraryImg from "@/assets/showcase/library.webp";
import detailImg from "@/assets/showcase/detail.webp";
import commentsImg from "@/assets/showcase/comments.webp";
import searchImg from "@/assets/showcase/search.webp";

const SCREENS = [
  { key: "library", img: libraryImg },
  { key: "detail", img: detailImg },
  { key: "comments", img: commentsImg },
  { key: "search", img: searchImg },
] as const;

export function Showcase() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="showcase" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("showcase.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("showcase.subtitle")}
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            "mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4",
            isVisible && "animate-fade-in-up",
          )}
        >
          {SCREENS.map(({ key, img }, index) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Phone frame */}
              <div className="relative aspect-[9/16] overflow-hidden bg-surface-light">
                {/* Fallback (behind image) */}
                <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-gradient-to-b from-surface-light to-surface p-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                    <div className="h-6 w-6 rounded-md bg-primary" />
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {t(`showcase.screens.${key}`)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t(`showcase.screens.${key}Desc`)}
                  </p>
                </div>
                {/* Screenshot image */}
                <img
                  src={img}
                  alt={t(`showcase.screens.${key}`)}
                  className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Label badge */}
                <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-text">
                    {t(`showcase.screens.${key}`)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t(`showcase.screens.${key}Desc`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
