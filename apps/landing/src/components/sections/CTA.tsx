import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useParallax } from "@/hooks/useParallax";

export function CTA() {
  const { t } = useTranslation();
  const blurLeftParallax = useParallax<HTMLDivElement>({ speed: 0.12 });
  const blurRightParallax = useParallax<HTMLDivElement>({ speed: -0.15 });

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark px-6 py-16 text-center sm:px-12 sm:py-24">
          {/* Decorative blurs with parallax */}
          <div className="absolute inset-0 opacity-20">
            <div
              ref={blurLeftParallax.ref}
              style={blurLeftParallax.style}
              className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-white/30 blur-3xl"
            />
            <div
              ref={blurRightParallax.ref}
              style={blurRightParallax.style}
              className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-white/20 blur-3xl"
            />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl md:text-5xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-background/80">
              {t("cta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="xl"
                className="bg-background text-primary hover:bg-background/90"
              >
                <a href="https://app.watchr.me">
                  {t("cta.button")}
                  <ArrowRight className="ml-2 h-6 w-6" />
                </a>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="border-background/30 text-background hover:bg-background/10"
              >
                <a href="#features">{t("cta.secondary")}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
