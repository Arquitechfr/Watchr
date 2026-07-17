import { useEffect, useRef, useState } from "react";

interface ParallaxOptions {
  speed?: number;
  axis?: "y" | "x" | "both";
  offset?: number;
}

interface ParallaxStyle {
  transform: string;
  willChange: string;
}

const IDLE_STYLE: ParallaxStyle = {
  transform: "translate3d(0, 0, 0)",
  willChange: "transform",
};

export function useParallax<T extends HTMLElement = HTMLDivElement>({
  speed = 0.3,
  axis = "y",
  offset = 0,
}: ParallaxOptions = {}) {
  const ref = useRef<T>(null);
  const [style, setStyle] = useState<ParallaxStyle>(IDLE_STYLE);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const node = el;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let rafId = 0;
    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          rafId = requestAnimationFrame(update);
        } else if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: 0, rootMargin: "100px 0px 100px 0px" },
    );

    observer.observe(node);

    function update() {
      if (!isVisible) return;

      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const distance = elementCenter - viewportCenter;

      const translateY = axis === "y" || axis === "both" ? distance * speed + offset : 0;
      const translateX = axis === "x" || axis === "both" ? distance * speed + offset : 0;

      setStyle({
        transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
        willChange: "transform",
      });

      rafId = requestAnimationFrame(update);
    }

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [speed, axis, offset]);

  return { ref, style };
}
