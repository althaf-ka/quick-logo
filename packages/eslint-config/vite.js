import js from "@eslint/js";
import globals from "globals";
import reactRefresh from "eslint-plugin-react-refresh";
import { config as reactInternalConfig } from "./react-internal.js";

/**
 * A custom ESLint configuration for Vite React apps.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [
  ...reactInternalConfig,
  {
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
];
