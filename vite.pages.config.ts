import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "pages",
  base: "/good-word-party-game/",
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/game.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (assetInfo) => assetInfo.names?.some((name) => name.endsWith(".css")) ? "assets/game.css" : "assets/[name][extname]",
      },
    },
  },
});
