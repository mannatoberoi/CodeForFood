import "./voice-agent.js";
import { getSupabase } from "./supabase-client.js";
import { ensureProfile } from "./supabase-quiz.js";
import { goProfileBack } from "./nav-return.js";

const usernameEl = document.getElementById("profile-username");
const emailEl = document.getElementById("profile-email");
const idEl = document.getElementById("profile-id");
const initialsEl = document.getElementById("profile-avatar-initials");
const avatarEl = document.getElementById("profile-avatar");
const messageEl = document.getElementById("profile-message");
const btnSignOut = document.getElementById("btn-sign-out");
const btnProfileBack = document.getElementById("profile-back");
const usernameInput = document.getElementById("profile-username-input");
const btnSaveUsername = document.getElementById("btn-save-username");
const currentPasswordInput = document.getElementById("profile-current-password");
const newPasswordInput = document.getElementById("profile-new-password");
const confirmPasswordInput = document.getElementById("profile-confirm-password");
const btnChangePassword = document.getElementById("btn-change-password");

let currentUser = null;

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

function normalizeUsername(value) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidUsername(value) {
  if (value.length < 2 || value.length > 32) return false;
  return /^[\w][\w\s.'-]*[\w]$|^[\w]$/i.test(value);
}

function setProfileBusy(busy) {
  [btnSaveUsername, btnChangePassword, btnSignOut, usernameInput, currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach((el) => {
    if (el) el.disabled = busy;
  });
}

function displayUsername(username) {
  if (usernameEl) usernameEl.textContent = username;
  if (usernameInput && document.activeElement !== usernameInput) {
    usernameInput.value = username;
  }
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

  currentUser = user;

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

  displayUsername(username);
  if (emailEl) emailEl.textContent = email;
  if (idEl) idEl.textContent = user.id;
  applyAvatar(username, user.id);
}

async function handleSaveUsername() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  const nextUsername = normalizeUsername(usernameInput?.value || "");
  if (!isValidUsername(nextUsername)) {
    setMessage("Username must be 2–32 characters (letters, numbers, spaces, . ' -).", "error");
    return;
  }

  setProfileBusy(true);
  setMessage("", "info");

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      username: nextUsername,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUser.id);

  if (updateError) {
    setMessage(updateError.message, "error");
    setProfileBusy(false);
    return;
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { username: nextUsername },
  });

  if (metaError) {
    setMessage(metaError.message, "error");
    setProfileBusy(false);
    return;
  }

  displayUsername(nextUsername);
  applyAvatar(nextUsername, currentUser.id);
  setMessage("Username updated.", "success");
  setProfileBusy(false);
}

async function handleChangePassword() {
  const supabase = getSupabase();
  if (!supabase || !currentUser?.email) return;

  const currentPassword = currentPasswordInput?.value || "";
  const newPassword = newPasswordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";

  if (!currentPassword || !newPassword) {
    setMessage("Enter your current and new password.", "error");
    return;
  }

  if (newPassword.length < 6) {
    setMessage("New password must be at least 6 characters.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    setMessage("New passwords do not match.", "error");
    return;
  }

  setProfileBusy(true);
  setMessage("", "info");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password: currentPassword,
  });

  if (signInError) {
    setMessage("Current password is incorrect.", "error");
    setProfileBusy(false);
    return;
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    setMessage(updateError.message, "error");
    setProfileBusy(false);
    return;
  }

  if (currentPasswordInput) currentPasswordInput.value = "";
  if (newPasswordInput) newPasswordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
  setMessage("Password updated.", "success");
  setProfileBusy(false);
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

btnProfileBack?.addEventListener("click", () => goProfileBack("./game.html"));
btnSaveUsername?.addEventListener("click", handleSaveUsername);
btnChangePassword?.addEventListener("click", handleChangePassword);
btnSignOut?.addEventListener("click", handleSignOut);
loadProfile();
