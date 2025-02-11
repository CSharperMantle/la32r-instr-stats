import react from "@vitejs/plugin-react-swc"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      strategies: "generateSW",
      workbox: {
        globPatterns: ["**/*.{html,js,css,wasm}", "**/*.{png,svg,txt}"],
        navigateFallbackDenylist: [/^.*\.map$/],
      },
      manifest: {
        name: "LA32R Instruction Statistics",
        short_name: "LA32RIStats",
        description:
          "Web app for collecting statistics over LoongArch32 Reduced binaries",
        theme_color: "#2196f3",
        icons: [
          {
            src: "./web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "./web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "./web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      treeshake: "recommended",
    },
    sourcemap: true,
  },
})
