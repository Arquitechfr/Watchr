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
        ...globals.node,
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
    ignores: [
      "**/dist/**",
      "**/dist-test/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.expo/**",
      "**/android/**",
      "**/ios/**",
      "**/web/**",
      "**/__tests__/**",
      "**/*.test.*",
      "**/*.spec.*",
      "**/scripts/**",
      "**/plugins/**",
      "**/*.config.{js,ts,cjs}",
      "**/credentials/**",
      "GoogleService-Info.plist",
      "google-services.json",
    ],
  },
);
