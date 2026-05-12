(function () {
  var TOTAL = 3;
  var slots = [
    document.getElementById("results-slot-1"),
    document.getElementById("results-slot-2"),
    document.getElementById("results-slot-3"),
  ];
  if (!slots[0]) return;

  var earned = [];
  try {
    earned = JSON.parse(localStorage.getItem("quiz_rewards") || "[]");
  } catch (_) {}

  for (var i = 0; i < slots.length; i++) {
    if (i < earned.length) {
      var img = slots[i].querySelector("img");
      if (img) {
        img.src = "../assets/images/" + earned[i];
        img.alt = "Reward unlocked";
      }
      slots[i].classList.add("is-unlocked");
    } else {
      slots[i].style.display = "none";
    }
  }

  var correct = earned.length;
  var incorrect = TOTAL - correct;

  var totalEl = document.getElementById("results-stat-total");
  var correctEl = document.getElementById("results-stat-correct");
  var incorrectEl = document.getElementById("results-stat-incorrect");
  var scoreEl = document.getElementById("results-stat-score");

  if (totalEl) totalEl.textContent = TOTAL;
  if (correctEl) correctEl.textContent = correct;
  if (incorrectEl) incorrectEl.textContent = incorrect;
  if (scoreEl) scoreEl.textContent = correct + "/" + TOTAL;
})();