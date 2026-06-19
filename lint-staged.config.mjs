import path from "path";
import fs from "fs";

const eslintConfigs = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  ".eslintrc.js",
  ".eslintrc.json",
  ".eslintrc",
  ".eslintrc.yaml",
  ".eslintrc.yml"
];

export default {
  // 1. Format all staged files with Prettier
  "**/*.{ts,tsx,js,jsx,json,md,css}": (filenames) => {
    const files = filenames.map((f) => `"${f}"`).join(" ");
    return [`prettier --write ${files}`];
  },

  // 2. Lint staged files with ESLint if the workspace package has an ESLint config
  "**/*.{ts,tsx,js,jsx}": (filenames) => {
    const groups = {};

    filenames.forEach((filename) => {
      const relativePath = path.relative(process.cwd(), filename);
      const parts = relativePath.split(path.sep);

      // Match files inside apps/* or packages/*
      if (parts.length > 2 && (parts[0] === "apps" || parts[0] === "packages")) {
        const packageDir = path.join(parts[0], parts[1]);
        
        // Dynamically detect if this workspace has an ESLint config
        const hasEslint = eslintConfigs.some((config) =>
          fs.existsSync(path.join(packageDir, config))
        );

        if (hasEslint) {
          if (!groups[packageDir]) {
            groups[packageDir] = [];
          }
          const fileInPackage = path.relative(packageDir, filename);
          groups[packageDir].push(fileInPackage);
        }
      }
    });

    const commands = [];
    Object.entries(groups).forEach(([packageDir, files]) => {
      const escapedFiles = files.map((f) => `"${f}"`).join(" ");
      commands.push(`cd ${packageDir} && pnpm exec eslint --fix ${escapedFiles}`);
    });

    return commands;
  }
};
