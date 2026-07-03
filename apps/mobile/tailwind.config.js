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
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
