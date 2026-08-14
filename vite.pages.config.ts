import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const release = "20260813-17";

export default defineConfig({
  root: "pages",
  base: "/good-word-party-game/",
  plugins: [
    react(),
    {
      name: "release-cache-buster",
      enforce: "post",
      transformIndexHtml(html) {
        return html
          .replace("/assets/game.js", `/assets/game.js?v=${release}`)
          .replace("/assets/game.css", `/assets/game.css?v=${release}`);
      },
    },
  ],
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
