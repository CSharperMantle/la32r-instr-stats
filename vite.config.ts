import react from "@vitejs/plugin-react-swc"
import vike from "vike/plugin"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import topLevelAwait from "vite-plugin-top-level-await"
import wasm from "vite-plugin-wasm"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vike(),
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
      manifest: false,
    }),
  ],
  build: {
    rollupOptions: {
      treeshake: "recommended",
    },
    sourcemap: true,
  },
})
