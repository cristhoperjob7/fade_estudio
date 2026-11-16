import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png", "favicon.svg", "favicon-32.png", "icons/apple-touch-icon.png", "icons/badge-96.png"],
      // Agrega al service worker la parte que recibe los avisos push (public/push-sw.js).
      workbox: { importScripts: ["push-sw.js"] },
      manifest: {
        name: "Fade Studio",
        short_name: "Fade Studio",
        description: "Agenda y reservas de la barbería",
        lang: "es-CL",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#09090b",
        background_color: "#09090b",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
