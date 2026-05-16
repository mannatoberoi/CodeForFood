import "./voice-agent.js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client.js";
import { fetchUserRewards, fetchLatestQuizRun } from "./supabase-quiz.js";

var grid = document.getElementById("rewards-grid");

function renderRecords(records) {
  if (!grid) return;
  grid.innerHTML = "";

  if (!records || records.length === 0) {
    var empty = document.createElement("p");
    empty.className = "rewards-empty";
    empty.textContent = "No rewards earned yet. Take the quiz!";
    grid.appendChild(empty);
    return;
  }

  records.forEach(function (rec) {
    var wrap = document.createElement("div");
    wrap.className = "rewards-record";

    var imgWrap = document.createElement("div");
    imgWrap.className = "rewards-record-img";

    var img = document.createElement("img");
    img.src = "../assets/images/" + rec.reward_key;
    img.alt = "Reward";
    img.width = 160;
    img.height = 160;
    img.decoding = "async";
    imgWrap.appendChild(img);

    wrap.appendChild(imgWrap);
    grid.appendChild(wrap);
  });
}

function buildFromLocalAnswers(answers, rewards) {
  var result = [];
  if (!Array.isArray(rewards) || rewards.length === 0) return result;

  var rewardIdx = 0;
  for (var i = 0; i < answers.length; i++) {
    if (answers[i].correct && rewardIdx < rewards.length) {
      result.push({
        reward_key: rewards[rewardIdx],
        question: answers[i].question,
        choice: answers[i].choice,
      });
      rewardIdx++;
    }
  }
  return result;
}

function loadLocal() {
  var answers = [];
  var rewards = [];
  try {
    answers = JSON.parse(localStorage.getItem("quiz_run_answers") || "[]");
    rewards = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
  } catch (_) {}
  return buildFromLocalAnswers(answers, rewards);
}

function rewardsToSimpleRecords(rewardKeys) {
  return (rewardKeys || []).map(function (key) {
    return { reward_key: key };
  });
}

(async function () {
  if (!grid) return;

  if (!isSupabaseConfigured()) {
    renderRecords(loadLocal());
    return;
  }

  var supabase = getSupabase();
  var { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    renderRecords(loadLocal());
    return;
  }

  var localRecords = loadLocal();

  var { rewards: dbRewards, error: rwErr } = await fetchUserRewards();
  var { run: latestRun, error: runErr } = await fetchLatestQuizRun();

  if (rwErr || runErr) {
    renderRecords(localRecords.length ? localRecords : null);
    return;
  }

  if (latestRun && latestRun.answers && latestRun.rewards) {
    var answersFromRun = Array.isArray(latestRun.answers) ? latestRun.answers : [];
    var rewardsFromRun = Array.isArray(latestRun.rewards) ? latestRun.rewards : [];
    var runRecords = buildFromLocalAnswers(answersFromRun, rewardsFromRun);
    if (runRecords.length) {
      renderRecords(runRecords);
      return;
    }
  }

  if (dbRewards && dbRewards.length) {
    renderRecords(rewardsToSimpleRecords(dbRewards.map(function (r) { return r.reward_key; })));
    return;
  }

  renderRecords(localRecords.length ? localRecords : null);
})();
