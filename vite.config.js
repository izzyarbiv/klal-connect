import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const API_TARGET = process.env.KC_API_URL || "http://localhost:4000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",

      manifest: {
        id: "/",
        name: "Klal Connect",
        short_name: "Klal",
        description:
          "A community-powered platform for finding trusted Jewish professionals, businesses, and resources in your area.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#0D3B44",
        background_color: "#101C1E",
        categories: ["business", "social", "lifestyle"],
        icons: [
          { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Directory", short_name: "Directory", url: "/directory" },
          { name: "Community feed", short_name: "Feed", url: "/feed" },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],

        navigateFallback: "index.html",
        // Without this, a direct navigation to /api/... — an uploaded image
        // opened in its own tab, any server redirect — is answered from the
        // cache with index.html instead of reaching the server.
        navigateFallbackDenylist: [/^\/api\//],

        // INVARIANT: this stays empty. Nothing under /api may ever be cached.
        //
        // Most of all /api/functions/getShabbosStatus, which decides whether the
        // app locks for Shabbos and Yom Tov. It is a POST, and Workbox routes
        // GET only, so today it cannot be cached even by accident — keeping this
        // empty means that stays true if it ever becomes a GET. Serving a stale
        // Shabbos status would show the app unlocked during Shabbos.
        runtimeCaching: [],

        cleanupOutdatedCaches: true,
        // Never take over a tab that is already running: a half-swapped build
        // can pair a new shell with old chunks.
        skipWaiting: false,
        clientsClaim: false,
      },

      // The service worker would shadow the dev proxy below.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    // fileURLToPath, not URL.pathname — the project path contains a space and
    // .pathname would hand Rollup a percent-encoded path that can't be opened.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    // The app calls /api/* relatively; in dev that goes to our own API server.
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  // The service worker is only active in a real build, so `vite preview` is the
  // only way to exercise it locally — it needs the same proxy.
  preview: {
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
});
