import "./voice-agent.js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client.js";
import {
  fetchLeaderboard,
  readLocalCompletedQuizMarks,
  syncQuizRunIfLoggedIn,
} from "./supabase-quiz.js";

const TOP_COUNT = 5;

const list = document.getElementById("leaderboard-list");
const statusEl = document.getElementById("leaderboard-status");

function setStatus(text, kind = "info") {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.dataset.kind = kind;
  statusEl.hidden = !text;
}

async function getCurrentUsername() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return data?.username || user.email?.split("@")[0] || null;
}

function createRow(row, currentUsername) {
  const li = document.createElement("li");
  const rankNum = Number(row.rank) || 0;
  const username = row.username || "player";
  li.className = "leaderboard-row";
  if (rankNum >= 1 && rankNum <= 3) {
    li.classList.add(`leaderboard-row--top-${rankNum}`);
  }
  if (currentUsername && username.toLowerCase() === currentUsername.toLowerCase()) {
    li.classList.add("leaderboard-row--you");
  }

  const rank = document.createElement("span");
  rank.className = "leaderboard-rank";
  rank.textContent = String(rankNum);
  rank.setAttribute("aria-label", `Rank ${rankNum}`);

  const name = document.createElement("span");
  name.className = "leaderboard-name";
  name.textContent = username;

  const marks = document.createElement("span");
  marks.className = "leaderboard-marks";
  marks.textContent = `${row.best_marks} pts`;

  li.append(rank, name, marks);
  return li;
}

function showLoading() {
  if (!list) return;
  list.innerHTML = "";
  list.classList.add("leaderboard-list--loading");
  for (let i = 0; i < TOP_COUNT; i += 1) {
    const li = document.createElement("li");
    li.className = "leaderboard-row leaderboard-row--skeleton";
    li.setAttribute("aria-hidden", "true");
    li.innerHTML =
      '<span class="leaderboard-rank"></span>' +
      '<span class="leaderboard-name"></span>' +
      '<span class="leaderboard-marks"></span>';
    list.appendChild(li);
  }
  setStatus("", "info");
}

function applyLocalScoreOverride(rows, currentUsername) {
  const localMarks = readLocalCompletedQuizMarks();
  if (localMarks == null || !currentUsername) return rows;

  const key = currentUsername.toLowerCase();
  let found = false;
  const updated = rows.map((row) => {
    if ((row.username || "").toLowerCase() === key) {
      found = true;
      return { ...row, best_marks: localMarks };
    }
    return row;
  });

  if (!found) {
    updated.push({ rank: 0, username: currentUsername, best_marks: localMarks });
  }

  updated.sort(
    (a, b) =>
      Number(b.best_marks) - Number(a.best_marks) ||
      String(a.username).localeCompare(String(b.username))
  );

  return updated.map((row, index) => ({ ...row, rank: index + 1 }));
}

function renderRows(rows, currentUsername) {
  if (!list) return;
  list.classList.remove("leaderboard-list--loading");
  list.innerHTML = "";

  if (rows.length === 0) {
    setStatus("No scores yet — play the quiz to claim the top spot!", "info");
    return;
  }

  setStatus("", "info");

  rows.slice(0, TOP_COUNT).forEach((row) => {
    list.appendChild(createRow(row, currentUsername));
  });
}

(async function init() {
  if (!list) return;

  showLoading();

  if (!isSupabaseConfigured()) {
    list.classList.remove("leaderboard-list--loading");
    list.innerHTML = "";
    setStatus(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
      "error"
    );
    return;
  }

  const syncResult = await syncQuizRunIfLoggedIn();
  const [result, currentUsername] = await Promise.all([
    fetchLeaderboard(TOP_COUNT),
    getCurrentUsername(),
  ]);

  if (syncResult.error) {
    console.warn("Leaderboard score sync failed:", syncResult.error.message);
  }

  if (result.error) {
    list.classList.remove("leaderboard-list--loading");
    list.innerHTML = "";
    setStatus(`Could not load scores: ${result.error}`, "error");
    return;
  }

  const rows = applyLocalScoreOverride(result.rows, currentUsername);
  renderRows(rows, currentUsername);
})();
