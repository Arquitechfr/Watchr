/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0F0F0F",
        surface: "#1A1A1A",
        "surface-light": "#2A2A2A",
        primary: "#FFB800",
        "primary-dark": "#E5A600",
        text: "#FFFFFF",
        "text-muted": "#9CA3AF",
        danger: "#EF4444",
        success: "#22C55E",
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
  plugins: [],
};
