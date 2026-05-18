import { getSupabase } from "./supabase-client.js";

export const MARKS_PER_CORRECT = 10;
export const QUIZ_QUESTION_COUNT = 3;
const SYNC_FP_KEY = "quiz_results_synced_fp";

export function computeQuizMarks(answers) {
  if (!Array.isArray(answers)) return { correctCount: 0, marks: 0 };
  const correctCount = answers.filter((a) => a && a.correct === true).length;
  return { correctCount, marks: correctCount * MARKS_PER_CORRECT };
}

export function readLocalCompletedQuizMarks() {
  try {
    const answers = JSON.parse(localStorage.getItem("quiz_run_answers") || "[]");
    if (!Array.isArray(answers) || answers.length < QUIZ_QUESTION_COUNT) return null;
    return computeQuizMarks(answers).marks;
  } catch {
    return null;
  }
}

export function quizFingerprintFromStorage() {
  try {
    const rewards = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
    const answers = JSON.parse(localStorage.getItem("quiz_run_answers") || "[]");
    return JSON.stringify({ r: rewards, a: answers });
  } catch {
    return "";
  }
}

export async function ensureProfile(supabase, user) {
  if (!user?.id) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return;
  const username = user.email?.split("@")[0] || "player";
  const { error: insErr } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email || "",
    username,
  });
  if (insErr) throw insErr;
}

/**
 * Persists the last finished quiz to Supabase (marks, answers, rewards).
 * @returns {Promise<{ ok?: boolean, skipped?: boolean, reason?: string, marks?: number, error?: Error }>}
 */
export async function syncQuizRunIfLoggedIn() {
  const supabase = getSupabase();
  if (!supabase) return { skipped: true, reason: "no_client" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { skipped: true, reason: "not_logged_in" };

  const fp = quizFingerprintFromStorage();
  if (!fp || fp === '{"r":[],"a":[]}') return { skipped: true, reason: "empty_quiz" };

  let rewards;
  let answers;
  try {
    rewards = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
    answers = JSON.parse(localStorage.getItem("quiz_run_answers") || "[]");
  } catch {
    return { skipped: true, reason: "parse_error" };
  }

  if (!Array.isArray(answers) || answers.length < QUIZ_QUESTION_COUNT) {
    return { skipped: true, reason: "incomplete_quiz" };
  }

  const { correctCount, marks } = computeQuizMarks(answers);

  try {
    await ensureProfile(supabase, user);
  } catch (e) {
    return { skipped: false, error: e instanceof Error ? e : new Error(String(e)) };
  }

  const prev = sessionStorage.getItem(SYNC_FP_KEY);
  const shouldInsertRun = prev !== fp;

  if (shouldInsertRun) {
    const { error: runErr } = await supabase.from("quiz_runs").insert({
      user_id: user.id,
      marks,
      correct_count: correctCount,
      answers,
      rewards,
    });
    if (runErr) return { skipped: false, error: new Error(runErr.message) };

    if (Array.isArray(rewards) && rewards.length > 0) {
      const rows = rewards.map((key) => ({
        user_id: user.id,
        reward_key: key,
      }));
      const { error: rwErr } = await supabase.from("user_rewards").upsert(rows, {
        onConflict: "user_id,reward_key",
      });
      if (rwErr) return { skipped: false, error: new Error(rwErr.message) };
    }

    sessionStorage.setItem(SYNC_FP_KEY, fp);
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ latest_marks: marks, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileErr) return { skipped: false, error: new Error(profileErr.message) };

  return { skipped: false, ok: true, marks };
}

export async function fetchUserRewards() {
  const supabase = getSupabase();
  if (!supabase) return { rewards: [], error: "no_client" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rewards: [], error: "not_logged_in" };
  const { data, error } = await supabase
    .from("user_rewards")
    .select("reward_key, earned_at")
    .order("earned_at", { ascending: true });
  if (error) return { rewards: [], error: error.message };
  return { rewards: data || [], error: null };
}

export async function fetchLeaderboard(limit = 10) {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], error: "no_client" };
  const { data, error } = await supabase.rpc("get_leaderboard", {
    limit_count: limit,
  });
  if (error) return { rows: [], error: error.message };
  return { rows: data || [], error: null };
}

export async function fetchLatestQuizRun() {
  const supabase = getSupabase();
  if (!supabase) return { run: null, error: "no_client" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { run: null, error: "not_logged_in" };
  const { data, error } = await supabase
    .from("quiz_runs")
    .select("answers, rewards, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { run: null, error: error.message };
  return { run: data || null, error: null };
}

export async function fetchLatestWrongAnswers() {
  const supabase = getSupabase();
  if (!supabase) return { wrong: [], error: "no_client" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { wrong: [], error: "not_logged_in" };
  const { data, error } = await supabase
    .from("quiz_runs")
    .select("answers, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { wrong: [], error: error.message };
  if (!data?.answers) return { wrong: [], error: null };
  const answers = Array.isArray(data.answers) ? data.answers : [];
  const wrong = answers.filter((a) => a && a.correct === false);
  return { wrong, error: null };
}
