import "./voice-agent.js";
import { isSupabaseConfigured } from "./supabase-client.js";
import { fetchLeaderboard } from "./supabase-quiz.js";

const list = document.getElementById("leaderboard-list");

(async function () {
  if (!list) return;

  if (!isSupabaseConfigured()) {
    return;
  }

  const { rows, error } = await fetchLeaderboard(10);
  if (error) {
    return;
  }

  list.innerHTML = "";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.className = "leaderboard-row";
    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(row.rank);
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = row.username || "player";
    const marks = document.createElement("span");
    marks.className = "leaderboard-marks";
    marks.textContent = String(row.best_marks) + " pts";
    li.append(rank, name, marks);
    list.appendChild(li);
  });
})();
