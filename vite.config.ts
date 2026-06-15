import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
    // Installable PWA — "Add to Home Screen" → full-screen, app icon, offline shell.
    VitePWA({
      // "prompt" (not autoUpdate): when a new deploy is detected we show a
      // "refresh to update" toast (PWAReloadPrompt) so installed users don't get
      // stranded on a stale bundle after a backend change (e.g. the private-bucket
      // migration that broke cached receipt URLs).
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "Desired Labs — AI CFO",
        short_name: "Desired Labs",
        description:
          "Your AI CFO — daily financial clarity, receipts, reports and tax for Main Street businesses.",
        theme_color: "#5B5BD6",
        background_color: "#F7F8FA",
        display: "standalone",
        orientation: "portrait",
        start_url: "/app",
        scope: "/",
        categories: ["finance", "business", "productivity"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        // NOTE: no skipWaiting/clientsClaim — the new SW must WAIT so the prompt
        // can ask the user; updateServiceWorker(true) activates it on Refresh.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Don't SPA-fallback Vercel Analytics / API paths.
        navigateFallbackDenylist: [/^\/_vercel/, /^\/api/],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":  ["react", "react-dom", "react-router-dom"],
          "vendor-query":  ["@tanstack/react-query"],
          "vendor-ui":     ["lucide-react"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
}));
