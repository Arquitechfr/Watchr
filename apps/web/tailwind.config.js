/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        outfit: ["Outfit", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
