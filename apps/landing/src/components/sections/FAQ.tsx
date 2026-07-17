import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/Accordion";

const FAQ_KEYS = [
  "free",
  "import",
  "platforms",
  "privacy",
  "account",
  "web",
  "languages",
] as const;

export function FAQ() {
  const { t } = useTranslation();

  return (
    <section id="faq" className="py-20 sm:py-28 bg-surface/50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t("faq.title")}
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            {t("faq.subtitle")}
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-12">
          {FAQ_KEYS.map((key, index) => (
            <AccordionItem key={key} value={`item-${index}`}>
              <AccordionTrigger>
                {t(`faq.items.${key}.question`)}
              </AccordionTrigger>
              <AccordionContent>
                {t(`faq.items.${key}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
