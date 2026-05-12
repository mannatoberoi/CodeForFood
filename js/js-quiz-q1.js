(function () {
  var opts = document.getElementById("js-quiz-q1-options");
  var overlays = document.querySelector(".js-quiz-q1-result-overlays");
  var forward = document.querySelector(".js-quiz-q1-forward");
  if (!opts) return;

  try { localStorage.removeItem("quiz_rewards"); } catch (_) {}

  opts.querySelectorAll("[data-option]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (document.body.classList.contains("js-quiz-q1-page--answered")) return;

      var choice = btn.getAttribute("data-option");
      document.body.classList.add("js-quiz-q1-page--answered");
      if (choice === "c") {
        document.body.classList.add("js-quiz-q1-page--result-correct");
        try {
          var r = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
          r.push("BURGER.png");
          localStorage.setItem("quiz_rewards", JSON.stringify(r));
        } catch (_) {}
      } else {
        document.body.classList.add("js-quiz-q1-page--result-wrong");
      }
      if (overlays) overlays.setAttribute("aria-hidden", "false");
      if (forward) forward.classList.add("is-visible");
    });
  });
})();
