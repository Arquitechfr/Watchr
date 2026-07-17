/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-light": "var(--color-surface-light)",
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },
      fontFamily: {
        sans: ["Outfit_400Regular"],
        outfit: ["Outfit_400Regular"],
        "outfit-thin": ["Outfit_100Thin"],
        "outfit-extralight": ["Outfit_200ExtraLight"],
        "outfit-light": ["Outfit_300Light"],
        "outfit-medium": ["Outfit_500Medium"],
        "outfit-semibold": ["Outfit_600SemiBold"],
        "outfit-bold": ["Outfit_700Bold"],
        "outfit-extrabold": ["Outfit_800ExtraBold"],
        "outfit-black": ["Outfit_900Black"],
      },
    },
  },
  plugins: [
    ({ addUtilities }) => {
      addUtilities({
        ".font-thin": { fontFamily: "Outfit_100Thin", fontWeight: "100" },
        ".font-extralight": { fontFamily: "Outfit_200ExtraLight", fontWeight: "200" },
        ".font-light": { fontFamily: "Outfit_300Light", fontWeight: "300" },
        ".font-normal": { fontFamily: "Outfit_400Regular", fontWeight: "400" },
        ".font-medium": { fontFamily: "Outfit_500Medium", fontWeight: "500" },
        ".font-semibold": { fontFamily: "Outfit_600SemiBold", fontWeight: "600" },
        ".font-bold": { fontFamily: "Outfit_700Bold", fontWeight: "700" },
        ".font-extrabold": { fontFamily: "Outfit_800ExtraBold", fontWeight: "800" },
        ".font-black": { fontFamily: "Outfit_900Black", fontWeight: "900" },
      });
    },
  ],
};
