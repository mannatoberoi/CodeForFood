/**
 * Tracks per-question outcomes for the current quiz run (stored in localStorage).
 * Used by results + Supabase sync; cleared when starting Q1.
 */
(function (global) {
  var KEY = "quiz_run_answers";
  var SYNC_FP_KEY = "quiz_results_synced_fp";

  function resetRun() {
    try {
      global.localStorage.setItem(KEY, "[]");
    } catch (_) {}
    try {
      global.sessionStorage.removeItem(SYNC_FP_KEY);
    } catch (_) {}
  }

  function recordAnswer(questionNum, isCorrect, choiceLetter, rewardKey) {
    var arr = [];
    try {
      arr = JSON.parse(global.localStorage.getItem(KEY) || "[]");
    } catch (_) {
      arr = [];
    }
    arr.push({
      question: questionNum,
      correct: !!isCorrect,
      choice: String(choiceLetter || ""),
      reward: rewardKey || null,
    });
    try {
      global.localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  global.QuizTrack = {
    resetRun: resetRun,
    recordAnswer: recordAnswer,
  };
})(typeof window !== "undefined" ? window : globalThis);
