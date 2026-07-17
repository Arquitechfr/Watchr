import { useWindowDimensions, Platform } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

const BREAKPOINTS: Record<Breakpoint, number> = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  if (width >= BREAKPOINTS.wide) return "wide";
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export function useIsDesktopWeb(): boolean {
  return Platform.OS === "web" && useBreakpoint() !== "mobile";
}

export function useIsWideWeb(): boolean {
  const bp = useBreakpoint();
  return Platform.OS === "web" && (bp === "wide" || bp === "desktop");
}

export { BREAKPOINTS };
