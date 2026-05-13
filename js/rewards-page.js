import "./voice-agent.js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client.js";
import { fetchUserRewards } from "./supabase-quiz.js";

const grid = document.getElementById("rewards-grid");

function renderLocalFallback() {
  if (!grid) return;
  let earned = [];
  try {
    earned = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
  } catch (_) {}
  grid.innerHTML = "";
  earned.forEach((file) => {
    const wrap = document.createElement("div");
    wrap.className = "rewards-grid-item";
    const img = document.createElement("img");
    img.src = "../assets/images/" + file;
    img.alt = "Reward";
    img.width = 160;
    img.height = 160;
    img.decoding = "async";
    wrap.appendChild(img);
    grid.appendChild(wrap);
  });
}

(async function () {
  if (!grid) return;

  if (!isSupabaseConfigured()) {
    renderLocalFallback();
    return;
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    renderLocalFallback();
    return;
  }

  const { rewards, error } = await fetchUserRewards();
  if (error) {
    renderLocalFallback();
    return;
  }

  grid.innerHTML = "";
  if (!rewards.length) {
    return;
  }

  rewards.forEach((row) => {
    const wrap = document.createElement("div");
    wrap.className = "rewards-grid-item";
    const img = document.createElement("img");
    img.src = "../assets/images/" + row.reward_key;
    img.alt = "Reward";
    img.width = 160;
    img.height = 160;
    img.decoding = "async";
    wrap.appendChild(img);
    grid.appendChild(wrap);
  });
})();
