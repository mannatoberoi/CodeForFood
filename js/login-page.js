import "./voice-agent.js";
import { getSupabase } from "./supabase-client.js";

const form = document.getElementById("auth-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const messageEl = document.getElementById("auth-message");
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");

function setMessage(text, kind = "info") {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.kind = kind;
}

function setBusy(busy) {
  [btnLogin, btnSignup, usernameInput, passwordInput].forEach((el) => {
    if (el) el.disabled = busy;
  });
}

function getEmail() {
  return (usernameInput?.value || "").trim().toLowerCase();
}

function getPassword() {
  return passwordInput?.value || "";
}

async function handleLogin(e) {
  e.preventDefault();
  const supabase = getSupabase();
  if (!supabase) {
    setMessage("Sign-in is not available (missing Supabase keys).", "error");
    return;
  }

  const email = getEmail();
  const password = getPassword();
  if (!email || !password) {
    setMessage("Enter your username (email) and password.", "error");
    return;
  }

  setBusy(true);
  setMessage("", "info");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setBusy(false);

  if (error) {
    setMessage(error.message, "error");
    return;
  }

  setMessage("", "info");
  window.location.assign("./profile.html");
}

async function handleSignup() {
  const supabase = getSupabase();
  if (!supabase) {
    setMessage("Sign-in is not available (missing Supabase keys).", "error");
    return;
  }

  const email = getEmail();
  const password = getPassword();
  if (!email || !password) {
    setMessage("Enter your username (email) and password to create an account.", "error");
    return;
  }

  setBusy(true);
  setMessage("", "info");

  const emailRedirectTo = new URL("./profile.html", window.location.href).href;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        username: email.split("@")[0] || "player",
      },
    },
  });
  setBusy(false);

  if (error) {
    setMessage(error.message, "error");
    return;
  }

  if (data.user && !data.session) {
    setMessage("Check your email to confirm, then sign in.", "success");
    return;
  }

  if (data.session) {
    setMessage("", "info");
    window.location.assign("./profile.html");
  }
}

async function redirectIfLoggedIn() {
  const supabase = getSupabase();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    window.location.assign("./profile.html");
  }
}

form?.addEventListener("submit", handleLogin);
btnSignup?.addEventListener("click", handleSignup);
redirectIfLoggedIn();
