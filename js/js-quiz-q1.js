(function () {
  var opts = document.getElementById("js-quiz-q1-options");
  var overlays = document.querySelector(".js-quiz-q1-result-overlays");
  if (!opts) return;

  opts.querySelectorAll("[data-option]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (document.body.classList.contains("js-quiz-q1-page--answered")) return;

      var choice = btn.getAttribute("data-option");
      document.body.classList.add("js-quiz-q1-page--answered");
      if (choice === "c") {
        document.body.classList.add("js-quiz-q1-page--result-correct");
      } else {
        document.body.classList.add("js-quiz-q1-page--result-wrong");
      }
      if (overlays) overlays.setAttribute("aria-hidden", "false");
    });
  });
})();
