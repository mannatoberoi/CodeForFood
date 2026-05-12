(function () {
  const about = document.getElementById("about");
  const flash = document.getElementById("portal-flash");

  if (!about || !flash) return;

  /** Same host/path as the home page (e.g. http://localhost:5173/pages/game.html under Vite). */
  const GAME_URL = new URL("pages/game.html", window.location.href).href;
  let triggered = false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function flashFallbackMs() {
    return reducedMotion.matches ? 200 : 700;
  }

  /** Pixels of page height from start of #about to bottom of viewport (how far we've "read" into About). */
  function scrollDepthIntoAbout() {
    return window.scrollY + window.innerHeight - about.offsetTop;
  }

  /** Open portal after one full About viewport + two more viewport heights of scroll (video stays sticky). */
  function portalThresholdPx() {
    const firstAboutScreen = Math.min(window.innerHeight, 900);
    return firstAboutScreen + window.innerHeight * 2;
  }

  function maybeOpenPortal() {
    if (triggered) return;
    if (scrollDepthIntoAbout() < portalThresholdPx()) return;

    triggered = true;
    window.removeEventListener("scroll", onScroll, { passive: true });

    flash.setAttribute("aria-hidden", "false");

    let didNavigate = false;
    function goToGame() {
      if (didNavigate) return;
      didNavigate = true;
      flash.removeEventListener("transitionend", onTransitionEnd);
      window.location.assign(GAME_URL);
    }

    function onTransitionEnd(e) {
      if (e.target !== flash || e.propertyName !== "opacity") return;
      goToGame();
    }

    flash.addEventListener("transitionend", onTransitionEnd);
    requestAnimationFrame(function () {
      flash.classList.add("is-active");
    });

    window.setTimeout(goToGame, flashFallbackMs());
  }

  function onScroll() {
    window.requestAnimationFrame(maybeOpenPortal);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  maybeOpenPortal();
})();
