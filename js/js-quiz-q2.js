(function () {
  var opts = document.getElementById("js-quiz-q2-options");
  var overlays = document.querySelector(".js-quiz-q2-result-overlays");
  var forward = document.querySelector(".js-quiz-q2-forward");
  if (!opts) return;

  opts.querySelectorAll("[data-option]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (document.body.classList.contains("js-quiz-q2-page--answered")) return;

      var choice = btn.getAttribute("data-option");
      document.body.classList.add("js-quiz-q2-page--answered");
      if (choice === "b") {
        document.body.classList.add("js-quiz-q2-page--result-correct");
        try {
          var r = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
          r.push("CAKE.png");
          localStorage.setItem("quiz_rewards", JSON.stringify(r));
        } catch (_) {}
      } else {
        document.body.classList.add("js-quiz-q2-page--result-wrong");
      }
      if (overlays) overlays.setAttribute("aria-hidden", "false");
      if (forward) forward.classList.add("is-visible");
    });
  });
})();