export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing?: number;
}

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 28, fontFamily: "Outfit_800ExtraBold", lineHeight: 34 },
  h2: { fontSize: 22, fontFamily: "Outfit_700Bold", lineHeight: 28 },
  h3: { fontSize: 18, fontFamily: "Outfit_600SemiBold", lineHeight: 24 },
  body: { fontSize: 16, fontFamily: "Outfit_400Regular", lineHeight: 22 },
  bodySmall: { fontSize: 14, fontFamily: "Outfit_400Regular", lineHeight: 20 },
  caption: { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 16 },
  label: { fontSize: 11, fontFamily: "Outfit_600SemiBold", lineHeight: 14, letterSpacing: 0.5 },
};

export const typographyClasses = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  bold: "font-bold",
  semibold: "font-semibold",
  medium: "font-medium",
  normal: "font-normal",
};
