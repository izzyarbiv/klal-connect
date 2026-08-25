import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const API_TARGET = process.env.KC_API_URL || "http://localhost:4000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
});
