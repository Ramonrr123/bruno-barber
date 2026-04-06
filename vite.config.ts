import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { lossless: false, quality: 80 },
      avif: { lossless: false, quality: 65 },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }

          if (id.includes("/@supabase/")) {
            return "vendor-supabase";
          }

          if (id.includes("/@tanstack/")) {
            return "vendor-query";
          }

          if (id.includes("/@radix-ui/")) {
            return "vendor-radix";
          }

          if (
            id.includes("/framer-motion/") ||
            id.includes("/lucide-react/") ||
            id.includes("/date-fns/") ||
            id.includes("/recharts/")
          ) {
            return "vendor-ui";
          }

          return "vendor";
        },
      },
    },
  },
}));
