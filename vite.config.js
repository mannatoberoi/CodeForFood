import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "pages/login.html"),
        dashboard: resolve(__dirname, "pages/dashboard.html"),
        game: resolve(__dirname, "pages/game.html"),
        leaderboard: resolve(__dirname, "pages/leaderboard.html"),
      },
    },
  },
});
