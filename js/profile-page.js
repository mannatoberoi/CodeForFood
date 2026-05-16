import "./voice-agent.js";
import { getSupabase } from "./supabase-client.js";
import { ensureProfile } from "./supabase-quiz.js";

const usernameEl = document.getElementById("profile-username");
const emailEl = document.getElementById("profile-email");
const idEl = document.getElementById("profile-id");
const initialsEl = document.getElementById("profile-avatar-initials");
const avatarEl = document.getElementById("profile-avatar");
const messageEl = document.getElementById("profile-message");
const btnSignOut = document.getElementById("btn-sign-out");

function setMessage(text, kind = "info") {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.kind = kind;
}

function getInitials(name) {
  const trimmed = (name || "P").trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase() || "P";
}

function avatarHueFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function applyAvatar(username, userId) {
  if (!initialsEl || !avatarEl) return;
  initialsEl.textContent = getInitials(username);
  const hue = avatarHueFromId(userId || username);
  avatarEl.style.setProperty("--profile-avatar-hue", String(hue));
  avatarEl.setAttribute("aria-label", `Profile picture for ${username}`);
}

async function loadProfile() {
  const supabase = getSupabase();
  if (!supabase) {
    window.location.assign("./login.html");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    window.location.assign("./login.html");
    return;
  }

  try {
    await ensureProfile(supabase, user);
  } catch {
    /* profile row may already exist from trigger */
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    setMessage(profileError.message, "error");
  }

  const username =
    profile?.username ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "player";
  const email = profile?.email || user.email || "—";

  if (usernameEl) usernameEl.textContent = username;
  if (emailEl) emailEl.textContent = email;
  if (idEl) idEl.textContent = user.id;
  applyAvatar(username, user.id);
}

async function handleSignOut() {
  const supabase = getSupabase();
  if (!supabase) return;

  if (btnSignOut) btnSignOut.disabled = true;
  setMessage("", "info");

  const { error } = await supabase.auth.signOut();
  if (error) {
    setMessage(error.message, "error");
    if (btnSignOut) btnSignOut.disabled = false;
    return;
  }

  window.location.assign("./login.html");
}

btnSignOut?.addEventListener("click", handleSignOut);
loadProfile();
