import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
    },
  },
  {
    files: ["**/*.js", "**/*.config.ts", "**/*.config.js"],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "postcss.config.js",
      "tailwind.config.js",
    ],
  },
);
