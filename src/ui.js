const BEST_KEY  = "snakeaz.best";
const THEME_KEY = "snakeaz.theme";

export function createUI() {
  const els = {
    score: document.getElementById("score"),
    best:  document.getElementById("best"),
    overlay: document.getElementById("overlay"),
    tagline: document.getElementById("tagline"),
    hints: document.getElementById("hints"),
    primary: document.getElementById("btn-primary"),
    primaryLb: document.getElementById("btn-primary-lb"),
    meta: document.getElementById("meta"),
    pause: document.getElementById("btn-pause"),
    sound: document.getElementById("btn-sound"),
    theme: document.getElementById("btn-theme"),
    touchpad: document.getElementById("touchpad"),
  };
  let best = readBest();
  els.best.textContent = best.toString();

  function setOverlay(state) {
    els.overlay.dataset.state = state;
  }
  function showStart() {
    setOverlay("start");
    els.tagline.textContent = "Müasir, neon dizaynlı Snake oyunu";
    els.primaryLb.textContent = "Oyna";
    els.meta.textContent = "";
    setPauseUI(false);
  }
  function showPaused() {
    setOverlay("paused");
    els.tagline.textContent = "Fasilə";
    els.primaryLb.textContent = "Davam et";
    els.meta.textContent = "Oyun dayandırıldı";
    setPauseUI(true);
  }
  function showPlaying() {
    setOverlay("playing");
    setPauseUI(false);
  }
  function showGameOver(score, isNewBest, reason) {
    setOverlay("gameover");
    els.tagline.textContent = isNewBest ? "Yeni rekord!" : "Oyun bitdi";
    els.primaryLb.textContent = "Yenidən başla";
    const why = reason === "wall" ? "divara çırpıldın" : "özünü yedin";
    els.meta.textContent = `Xal: ${score} · ${why}` + (isNewBest ? "  ⚡  yeni rekord" : "");
    setPauseUI(false);
  }
  function setScore(value) { els.score.textContent = String(value); }
  function setBest(value)  { best = value; els.best.textContent = String(value); writeBest(value); }
  function getBest()       { return best; }

  function setPauseUI(isPaused) {
    const onPlay = els.pause.querySelector("[data-play]");
    const onPause = els.pause.querySelector("[data-pause]");
    if (!onPlay || !onPause) return;
    onPlay.hidden = !isPaused;
    onPause.hidden = isPaused;
    els.pause.setAttribute("aria-label", isPaused ? "Davam et" : "Fasilə");
  }
  function setSoundUI(muted) {
    const onIc  = els.sound.querySelector("[data-on]");
    const offIc = els.sound.querySelector("[data-off]");
    if (!onIc || !offIc) return;
    onIc.hidden  = muted;
    offIc.hidden = !muted;
    els.sound.setAttribute("aria-pressed", String(!muted));
    els.sound.setAttribute("aria-label", muted ? "Səsi aç" : "Səsi bağla");
  }

  function showTouchpad(visible) {
    els.touchpad.hidden = !visible;
  }

  return {
    els,
    showStart, showPaused, showPlaying, showGameOver,
    setScore, setBest, getBest,
    setPauseUI, setSoundUI, showTouchpad,
  };
}

export function applyTheme(theme) {
  document.body.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fb" : "#0a0e16");
}
export function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch (_) { return "dark"; }
}

function readBest() {
  try {
    const v = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch (_) { return 0; }
}
function writeBest(v) {
  try { localStorage.setItem(BEST_KEY, String(Math.floor(v))); } catch (_) {}
}
