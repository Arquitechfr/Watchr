import { useTranslation } from "react-i18next";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useParallax } from "@/hooks/useParallax";
import { cn } from "@/lib/utils";
import libraryImg from "@/assets/showcase/library.webp";
import detailImg from "@/assets/showcase/detail.webp";
import commentsImg from "@/assets/showcase/comments.webp";
import searchImg from "@/assets/showcase/search.webp";

const SCREENS = [
  { key: "library", img: libraryImg, speed: 0.04 },
  { key: "detail", img: detailImg, speed: -0.06 },
  { key: "comments", img: commentsImg, speed: 0.05 },
  { key: "search", img: searchImg, speed: -0.04 },
] as const;

function ShowcaseCard({
  img,
  label,
  description,
  speed,
  delay,
  visible,
}: {
  img: string;
  label: string;
  description: string;
  speed: number;
  delay: number;
  visible: boolean;
}) {
  const { ref, style } = useParallax<HTMLDivElement>({ speed });

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-surface",
        visible && "animate-fade-in-up",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Phone frame */}
      <div className="relative aspect-[9/16] overflow-hidden bg-surface-light">
        {/* Fallback (behind image) */}
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-gradient-to-b from-surface-light to-surface p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <div className="h-6 w-6 rounded-md bg-primary" />
          </div>
          <p className="text-sm font-semibold text-text">{label}</p>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>
        {/* Screenshot image with parallax */}
        <div ref={ref} style={style} className="absolute inset-0 z-10">
          <img
            src={img}
            alt={label}
            className="h-full w-full scale-110 object-cover transition-transform duration-500 group-hover:scale-115"
            loading="lazy"
          />
        </div>
        {/* Label badge */}
        <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur-sm">
          <p className="text-sm font-semibold text-text">{label}</p>
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

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
          className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {SCREENS.map(({ key, img, speed }, index) => (
            <ShowcaseCard
              key={key}
              img={img}
              label={t(`showcase.screens.${key}`)}
              description={t(`showcase.screens.${key}Desc`)}
              speed={speed}
              delay={index * 100}
              visible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
