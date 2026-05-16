import "./voice-agent.js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client.js";
import { fetchLatestWrongAnswers } from "./supabase-quiz.js";

const QUESTION_LABEL = {
  1: "Q1 — declaring a variable",
  2: "Q2 — variable declaration",
};

const container = document.getElementById("revise-wrong-list");

function addLine(text) {
  if (!container) return;
  const line = document.createElement("div");
  line.className = "revise-line";
  line.textContent = text;
  container.appendChild(line);
}

function renderFromLocalStorage() {
  if (!container) return;
  let answers = [];
  try {
    answers = JSON.parse(localStorage.getItem("quiz_run_answers") || "[]");
  } catch (_) {}
  const wrong = Array.isArray(answers) ? answers.filter((a) => a && a.correct === false) : [];
  container.innerHTML = "";
  wrong.forEach((a) => {
    addLine("chose " + String(a.choice || "?").toUpperCase());
  });
}

(async function () {
  if (!container) return;

  if (!isSupabaseConfigured()) {
    renderFromLocalStorage();
    return;
  }

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    renderFromLocalStorage();
    return;
  }

  const { wrong, error } = await fetchLatestWrongAnswers();
  if (error) {
    renderFromLocalStorage();
    return;
  }

  container.innerHTML = "";
  if (!wrong.length) {
    return;
  }

  wrong.forEach((a) => {
    addLine("chose " + String(a.choice || "?").toUpperCase());
  });
})();
