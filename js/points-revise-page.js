import "./voice-agent.js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client.js";
import { fetchLatestWrongAnswers } from "./supabase-quiz.js";

const QUESTION_LABEL = {
  1: "Q1 — declaring a variable",
  2: "Q2 — variable declaration",
};

const container = document.getElementById("revise-wrong-list");

const btnJscho = document.getElementById("btn-jscho");
const overlay = document.getElementById("jscho-overlay");
const closeBtn = document.getElementById("jscho-close");

if (btnJscho && overlay && closeBtn) {
  btnJscho.addEventListener("click", (e) => {
    e.preventDefault();
    overlay.classList.add("jscho-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
  const close = () => {
    overlay.classList.remove("jscho-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("jscho-open")) close();
  });
}

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
