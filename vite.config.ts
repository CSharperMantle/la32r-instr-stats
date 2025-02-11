import react from "@vitejs/plugin-react-swc"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  build: {
    rollupOptions: {
      treeshake: "smallest",
    },
  },
})
