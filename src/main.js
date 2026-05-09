import { createState, reset, queueDirection, tick } from "./game.js";
import { fitCanvas, render, readTheme as readPaletteVars } from "./render.js";
import { bindInput } from "./input.js";
import { createAudio } from "./audio.js";
import { createUI, applyTheme, readTheme } from "./ui.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const dpad = document.getElementById("touchpad");

const state = createState();
const ui = createUI();
const audio = createAudio();
const particles = [];

applyTheme(readTheme());
ui.setSoundUI(audio.isMuted());

const isCoarse = matchMedia("(hover: none) and (pointer: coarse)").matches;
ui.showTouchpad(isCoarse);

let theme = readPaletteVars();
let pendingFitToken = 0;
function refit() {
  fitCanvas(canvas);
  theme = readPaletteVars();
}
window.addEventListener("resize", () => {
  const token = ++pendingFitToken;
  requestAnimationFrame(() => { if (token === pendingFitToken) refit(); });
}, { passive: true });

const sfx = audio;

function startGame() {
  if (state.state === "playing") return;
  audio.resumeCtx();
  reset(state);
  state.state = "playing";
  ui.setScore(state.score);
  ui.showPlaying();
  particles.length = 0;
  sfx.start();
  last = performance.now();
}
function gameOver(reason) {
  state.state = "gameover";
  state.deathReason = reason;
  sfx.die();
  vibrate([60, 40, 80]);
  spawnDeathBurst();
  const isNewBest = state.score > ui.getBest();
  if (isNewBest) ui.setBest(state.score);
  ui.showGameOver(state.score, isNewBest, reason);
}
function pauseGame() {
  if (state.state !== "playing") return;
  state.state = "paused";
  ui.showPaused();
  sfx.pause();
}
function resumeGame() {
  if (state.state !== "paused") return;
  state.state = "playing";
  ui.showPlaying();
  sfx.resume();
  last = performance.now();
}
function togglePause() {
  if (state.state === "playing") pauseGame();
  else if (state.state === "paused") resumeGame();
}
function restartOrStart() {
  if (state.state === "gameover" || state.state === "ready") startGame();
  else if (state.state === "paused") resumeGame();
}

bindInput(canvas, dpad, {
  onDirection(dir) {
    if (state.state === "ready" || state.state === "gameover") startGame();
    if (state.state === "playing") queueDirection(state, dir);
  },
  onPause() {
    if (state.state === "ready" || state.state === "gameover") {
      startGame();
      return;
    }
    togglePause();
  },
  onStart() { restartOrStart(); },
  onAny()   { audio.resumeCtx(); },
});

ui.els.primary.addEventListener("click", () => {
  audio.resumeCtx();
  if (state.state === "paused") resumeGame();
  else startGame();
});
ui.els.pause.addEventListener("click", () => {
  audio.resumeCtx();
  if (state.state === "ready" || state.state === "gameover") { startGame(); return; }
  togglePause();
});
ui.els.sound.addEventListener("click", () => {
  audio.resumeCtx();
  audio.setMuted(!audio.isMuted());
  ui.setSoundUI(audio.isMuted());
});
ui.els.theme.addEventListener("click", () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  theme = readPaletteVars();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.state === "playing") pauseGame();
});

const events = {
  eat(isBonus, cell) {
    sfx[isBonus ? "bonus" : "eat"]();
    vibrate(isBonus ? [25, 30, 40] : 25);
    spawnEatBurst(cell, isBonus);
    ui.setScore(state.score);
  },
  die(reason) { gameOver(reason); },
};

function spawnEatBurst(cell, isBonus) {
  const cellPx = canvas.width / state.cols;
  const cx = cell.x * cellPx + cellPx / 2;
  const cy = cell.y * cellPx + cellPx / 2;
  const count = isBonus ? 22 : 12;
  const baseColor = isBonus ? hex2rgb(theme.danger2) : hex2rgb(theme.danger);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = (isBonus ? 1.7 : 1.2) * (0.7 + Math.random() * 0.7);
    particles.push({
      kind: "spark",
      x: cx, y: cy,
      vx: Math.cos(a) * speed * (cellPx * 0.06),
      vy: Math.sin(a) * speed * (cellPx * 0.06),
      life: 0,
      maxLife: 600 + Math.random() * 200,
      size: cellPx * (isBonus ? 0.10 : 0.08),
      color: isBonus ? theme.danger2 : theme.danger,
      r: baseColor[0], g: baseColor[1], b: baseColor[2],
    });
  }
  particles.push({
    kind: "score",
    x: cx, y: cy - cellPx * 0.4,
    vy: -0.7,
    life: 0,
    maxLife: 720,
    text: isBonus ? "+50" : "+10",
  });
}
function spawnDeathBurst() {
  const cellPx = canvas.width / state.cols;
  const head = state.snake[0];
  if (!head) return;
  const cx = head.x * cellPx + cellPx / 2;
  const cy = head.y * cellPx + cellPx / 2;
  const c = hex2rgb(theme.accent);
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 1.4;
    particles.push({
      kind: "spark",
      x: cx, y: cy,
      vx: Math.cos(a) * speed * (cellPx * 0.10),
      vy: Math.sin(a) * speed * (cellPx * 0.10),
      life: 0,
      maxLife: 850 + Math.random() * 200,
      size: cellPx * 0.10,
      color: theme.accent,
      r: c[0], g: c[1], b: c[2],
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.kind === "spark") {
      p.x += p.vx * (dt / 16.6667);
      p.y += p.vy * (dt / 16.6667);
      p.vy += 0.04 * (dt / 16.6667);
    } else if (p.kind === "score") {
      p.y += p.vy * (dt / 16.6667);
    }
    if (p.life >= p.maxLife) particles.splice(i, 1);
  }
}

function vibrate(pattern) {
  if (!("vibrate" in navigator)) return;
  try { navigator.vibrate(pattern); } catch (_) {}
}
function hex2rgb(hex) {
  hex = hex.trim();
  if (hex.startsWith("rgb")) {
    const m = hex.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  }
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

let last = 0;
function loop(t) {
  if (!last) last = t;
  let dt = t - last;
  last = t;
  if (dt > 100) dt = 100;
  if (state.state === "playing") tick(state, dt, events);
  updateParticles(dt);
  render(ctx, state, theme, particles, t);
  requestAnimationFrame(loop);
}

reset(state);
state.state = "ready";
ui.showStart();
refit();
requestAnimationFrame(loop);
