import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";

const packagePath = (id: string, packageName: string) => {
  const pnpmPackageName = packageName.replace("/", "+");

  return (
    id.includes(`/node_modules/${packageName}/`) ||
    id.includes(`/node_modules/.pnpm/${pnpmPackageName}@`)
  );
};

const pdfChunks = [
  {
    name: "pdf-font-engine",
    packages: [
      "fontkit",
      "restructure",
      "unicode-properties",
      "unicode-trie",
      "tiny-inflate",
      "dfa",
      "brotli",
    ],
  },
  {
    name: "pdf-pdfkit",
    packages: ["@react-pdf/pdfkit", "pako", "png-js", "jay-peg", "linebreak"],
  },
  {
    name: "pdf-reconciler",
    packages: ["@react-pdf/reconciler"],
  },
  {
    name: "pdf-layout",
    packages: [
      "@react-pdf/renderer",
      "@react-pdf/layout",
      "@react-pdf/textkit",
      "@react-pdf/render",
      "@react-pdf/image",
      "@react-pdf/font",
      "yoga-layout",
      "hyphen",
    ],
  },
] as const;

const splitPdfDependencies = (id: string) => {
  if (!id.includes("node_modules")) {
    return;
  }

  return pdfChunks.find(({ packages }) =>
    packages.some((packageName) => packagePath(id, packageName)),
  )?.name;
};

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: splitPdfDependencies,
        onlyExplicitManualChunks: true,
      },
    },
  },
  publicDir: path.resolve(__dirname, "../../packages/assets/public"),
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
