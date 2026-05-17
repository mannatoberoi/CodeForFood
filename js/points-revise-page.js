import "./voice-agent.js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client.js";
import { fetchLatestWrongAnswers } from "./supabase-quiz.js";

const QUESTION_LABEL = {
  1: "Q1 — declaring a variable",
  2: "Q2 — variable declaration",
};

const container = document.getElementById("revise-wrong-list");

function renderFromLocalStorage() {
  if (!container) return;
  container.innerHTML = "";
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
})();
