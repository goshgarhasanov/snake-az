import { COLS, ROWS, progressFraction } from "./game.js";

let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

export function fitCanvas(canvas) {
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.max(120, Math.floor(Math.min(rect.width, rect.height)));
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  canvas.width = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  return size;
}

export function readTheme() {
  const root = getComputedStyle(document.documentElement);
  return {
    bg:      root.getPropertyValue("--bg-2").trim()       || "#121826",
    bg3:     root.getPropertyValue("--bg-3").trim()       || "#1a2235",
    line:    root.getPropertyValue("--line").trim()       || "#232a3a",
    fg:      root.getPropertyValue("--fg").trim()         || "#f1f3f7",
    accent:  root.getPropertyValue("--accent").trim()     || "#39ff8e",
    accent2: root.getPropertyValue("--accent-2").trim()   || "#5eead4",
    danger:  root.getPropertyValue("--danger").trim()     || "#ff5e7a",
    danger2: root.getPropertyValue("--danger-2").trim()   || "#ffb84d",
  };
}

export function render(ctx, s, theme, particles, t) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const cell = cw / s.cols;
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  drawBoard(ctx, cw, ch, cell, theme);

  if (s.flash > 0) {
    ctx.fillStyle = `rgba(57,255,142,${s.flash * 0.18})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  if (s.food) drawFood(ctx, s.food, cell, theme, t, false);
  if (s.bonus) drawBonus(ctx, s.bonus, cell, theme, t);

  drawSnake(ctx, s, cell, theme);
  drawParticles(ctx, particles, cell);

  ctx.restore();
}

function drawBoard(ctx, w, h, cell, theme) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, theme.bg3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = `rgba(255,255,255,0.025)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(Math.round(x * cell) + 0.5, 0);
    ctx.lineTo(Math.round(x * cell) + 0.5, h);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, Math.round(y * cell) + 0.5);
    ctx.lineTo(w, Math.round(y * cell) + 0.5);
  }
  ctx.stroke();

  ctx.fillStyle = `rgba(57,255,142,0.04)`;
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, h - 2, w, 2);
  ctx.fillRect(0, 0, 2, h);
  ctx.fillRect(w - 2, 0, 2, h);
}

function drawSnake(ctx, s, cell, theme) {
  const t = progressFraction(s);
  const ease = t;
  const r = cell * 0.42;
  const padding = cell * 0.10;

  for (let i = s.snake.length - 1; i >= 0; i--) {
    const cur = s.snake[i];
    const prev = s.prevSnake[i] || cur;
    const moving = s.state === "playing";
    const ix = lerp(prev.x, cur.x, moving ? ease : 1) * cell;
    const iy = lerp(prev.y, cur.y, moving ? ease : 1) * cell;

    const isHead = i === 0;
    const ratio = i / Math.max(1, s.snake.length - 1);
    const color = isHead ? theme.accent : mixHex(theme.accent, theme.accent2, ratio);

    ctx.save();
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = isHead ? 18 : 10;
    drawRoundRect(ctx, ix + padding, iy + padding, cell - padding * 2, cell - padding * 2, r);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    if (!isHead && i < s.snake.length - 1) {
      const next = s.snake[i - 1];
      const np = s.prevSnake[i - 1] || next;
      const nx = lerp(np.x, next.x, moving ? ease : 1) * cell;
      const ny = lerp(np.y, next.y, moving ? ease : 1) * cell;
      const cx = (ix + nx) / 2 + cell / 2;
      const cy2 = (iy + ny) / 2 + cell / 2;
      ctx.save();
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 8;
      ctx.fillStyle = mixHex(theme.accent, theme.accent2, ratio);
      ctx.beginPath();
      ctx.arc(cx, cy2, cell * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (isHead) drawHeadFeatures(ctx, s, ix, iy, cell, theme);
  }
}

function drawHeadFeatures(ctx, s, ix, iy, cell, theme) {
  const dir = s.direction;
  const cx = ix + cell / 2;
  const cy = iy + cell / 2;
  const off = cell * 0.20;
  const eyeR = cell * 0.07;
  const orient = Math.abs(dir.x) > 0;
  const e1 = orient
    ? { x: cx + dir.x * off * 0.6, y: cy - off * 0.6 }
    : { x: cx - off * 0.6,         y: cy + dir.y * off * 0.6 };
  const e2 = orient
    ? { x: cx + dir.x * off * 0.6, y: cy + off * 0.6 }
    : { x: cx + off * 0.6,         y: cy + dir.y * off * 0.6 };
  ctx.fillStyle = "#06120b";
  ctx.beginPath(); ctx.arc(e1.x, e1.y, eyeR + 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x, e2.y, eyeR + 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#06120b";
  ctx.beginPath(); ctx.arc(e1.x + dir.x * 1.5, e1.y + dir.y * 1.5, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x + dir.x * 1.5, e2.y + dir.y * 1.5, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
}

function drawFood(ctx, food, cell, theme, t) {
  const cx = food.x * cell + cell / 2;
  const cy = food.y * cell + cell / 2;
  const pulse = 0.5 + 0.5 * Math.sin(t / 280);
  const r = cell * (0.30 + pulse * 0.06);
  ctx.save();
  ctx.shadowColor = theme.danger;
  ctx.shadowBlur = 24 + pulse * 6;
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBonus(ctx, bonus, cell, theme, t) {
  const cx = bonus.x * cell + cell / 2;
  const cy = bonus.y * cell + cell / 2;
  const lifeLeft = 1 - bonus.life / bonus.maxLife;
  const blink = lifeLeft < 0.30 ? (Math.sin(t / 70) > 0 ? 1 : 0.2) : 1;
  const pulse = 0.5 + 0.5 * Math.sin(t / 200);
  const r = cell * (0.32 + pulse * 0.08);
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.shadowColor = theme.danger2;
  ctx.shadowBlur = 28 + pulse * 8;
  ctx.fillStyle = theme.danger2;
  drawStar(ctx, cx, cy, 5, r, r * 0.45);
  ctx.fill();
  ctx.restore();
  if (lifeLeft > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t / 800);
    ctx.strokeStyle = `rgba(255,184,77,${0.5 * lifeLeft})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2 * lifeLeft);
    ctx.stroke();
    ctx.restore();
  }
}

function drawStar(ctx, cx, cy, spikes, outer, inner) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
}

function drawParticles(ctx, particles, cell) {
  for (const p of particles) {
    const a = Math.max(0, 1 - p.life / p.maxLife);
    if (p.kind === "spark") {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12 * a;
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`;
      const r = (p.size || 3) * a + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "score") {
      ctx.save();
      ctx.fillStyle = `rgba(57,255,142,${a})`;
      ctx.font = `bold ${Math.round(cell * 0.7)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
}

function lerp(a, b, t) { return a + (b - a) * t; }

function mixHex(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const c = Math.round(ab + (bb - ab) * t);
  return "rgb(" + r + "," + g + "," + c + ")";
}
