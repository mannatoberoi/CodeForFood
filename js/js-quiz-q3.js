(function () {
  var opts = document.getElementById("js-quiz-q3-options");
  var overlays = document.querySelector(".js-quiz-q3-result-overlays");
  var forward = document.querySelector(".js-quiz-q3-forward");
  if (!opts) return;

  opts.querySelectorAll("[data-option]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (document.body.classList.contains("js-quiz-q3-page--answered")) return;

      var choice = btn.getAttribute("data-option");
      document.body.classList.add("js-quiz-q3-page--answered");
      var isCorrect = choice === "a";
      var rewardKey = isCorrect ? "FRIES.png" : null;
      if (window.QuizTrack && typeof window.QuizTrack.recordAnswer === "function") {
        window.QuizTrack.recordAnswer(3, isCorrect, choice, rewardKey);
      }
      if (isCorrect) {
        document.body.classList.add("js-quiz-q3-page--result-correct");
        try {
          var r = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
          r.push("FRIES.png");
          localStorage.setItem("quiz_rewards", JSON.stringify(r));
        } catch (_) {}
      } else {
        document.body.classList.add("js-quiz-q3-page--result-wrong");
      }
      if (overlays) overlays.setAttribute("aria-hidden", "false");
      if (forward) forward.classList.add("is-visible");
    });
  });
})();