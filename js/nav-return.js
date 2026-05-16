const PROFILE_RETURN_KEY = "cffProfileReturnUrl";
const LAST_VISITED_KEY = "cffLastVisitedUrl";

function isExcludedPath(pathname) {
  return /\/(profile|login)\.html$/i.test(pathname);
}

function isValidReturnTarget(stored, here) {
  try {
    const target = new URL(stored, here.href);
    if (target.origin !== here.origin) return false;
    if (isExcludedPath(target.pathname)) return false;
    if (target.href === here.href) return false;
    return true;
  } catch {
    return false;
  }
}

export function recordCurrentVisit() {
  if (isExcludedPath(window.location.pathname)) return;
  try {
    sessionStorage.setItem(LAST_VISITED_KEY, window.location.href);
  } catch {
    /* ignore */
  }
}

export function saveProfileReturnUrl(url = window.location.href) {
  try {
    const pathname = new URL(url, window.location.href).pathname;
    if (isExcludedPath(pathname)) return;
    sessionStorage.setItem(PROFILE_RETURN_KEY, url);
  } catch {
    /* ignore */
  }
}

export function goProfileBack(fallback = "./game.html") {
  const here = new URL(window.location.href);
  const candidates = [
    sessionStorage.getItem(PROFILE_RETURN_KEY),
    sessionStorage.getItem(LAST_VISITED_KEY),
  ].filter(Boolean);

  for (const stored of candidates) {
    if (isValidReturnTarget(stored, here)) {
      window.location.assign(stored);
      return;
    }
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.assign(fallback);
}

function initNavReturn() {
  recordCurrentVisit();

  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest?.('a[href*="profile.html"]');
      if (!link || isExcludedPath(window.location.pathname)) return;
      saveProfileReturnUrl();
    },
    true
  );
}

initNavReturn();
