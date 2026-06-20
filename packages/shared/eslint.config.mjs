import { config } from "@quicklogo/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
