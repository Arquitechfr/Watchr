import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { ImportSection } from "@/components/sections/ImportSection";
import { Showcase } from "@/components/sections/Showcase";
import { Stats } from "@/components/sections/Stats";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { ApiTeaser } from "@/components/sections/ApiTeaser";
import { CTA } from "@/components/sections/CTA";

export function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <ImportSection />
      <Showcase />
      <Stats />
      <Testimonials />
      <FAQ />
      <ApiTeaser />
      <CTA />
    </>
  );
}
