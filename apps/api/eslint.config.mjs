import { config } from "@quicklogo/eslint-config/hono";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [".wrangler/**", "dist/**", ".turbo/**", "eslint.config.mjs"],
  },
  ...config,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
