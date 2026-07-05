export type ThemeMode = "light" | "dark";

export interface ColorPalette {
  background: string;
  surface: string;
  surfaceLight: string;
  primary: string;
  primaryDark: string;
  text: string;
  textMuted: string;
  danger: string;
  success: string;
  border: string;
}

export const darkColors: ColorPalette = {
  background: "#1A1614",
  surface: "#252019",
  surfaceLight: "#332C24",
  primary: "#C65D3A",
  primaryDark: "#A84A2E",
  text: "#F5F0EB",
  textMuted: "#A89B91",
  danger: "#E54D4D",
  success: "#5BAE6A",
  border: "#3D352D",
};

export const lightColors: ColorPalette = {
  background: "#FAF6F2",
  surface: "#F0EAE3",
  surfaceLight: "#E5DDD4",
  primary: "#C65D3A",
  primaryDark: "#A84A2E",
  text: "#2A2018",
  textMuted: "#7A6B5E",
  danger: "#D63B3B",
  success: "#3D8B4E",
  border: "#D4C9BE",
};

export function getColors(mode: ThemeMode): ColorPalette {
  return mode === "dark" ? darkColors : lightColors;
}
