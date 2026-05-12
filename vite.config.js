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
        rewards: resolve(__dirname, "pages/rewards.html"),
        pointsToRevise: resolve(__dirname, "pages/points-to-revise.html"),
        game: resolve(__dirname, "pages/game.html"),
        jsQuizQ1: resolve(__dirname, "pages/js-quiz-q1.html"),
        leaderboard: resolve(__dirname, "pages/leaderboard.html"),
      },
    },
  },
});
