export const COLS = 21;
export const ROWS = 21;

export const DIR = Object.freeze({
  up:    { x: 0, y: -1 },
  down:  { x: 0, y:  1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 },
});

const INITIAL_LENGTH = 4;
const BASE_STEPS_PER_SEC = 7.5;
const MAX_STEPS_PER_SEC  = 16;
const SPEED_GROWTH       = 0.18;
const BONUS_EVERY        = 7;
const BONUS_LIFETIME_MS  = 5500;

export function createState() {
  return {
    cols: COLS,
    rows: ROWS,
    snake: [],
    prevSnake: [],
    direction: { ...DIR.right },
    queued: [],
    food: null,
    bonus: null,
    score: 0,
    foodEaten: 0,
    stepsPerSec: BASE_STEPS_PER_SEC,
    stepProgress: 0,
    state: "ready",
    grew: 0,
    flash: 0,
    deathReason: null,
    lastEatAt: -1e9,
  };
}

export function reset(s) {
  s.snake = makeInitialSnake();
  s.prevSnake = s.snake.map(p => ({ ...p }));
  s.direction = { ...DIR.right };
  s.queued = [];
  s.score = 0;
  s.foodEaten = 0;
  s.stepsPerSec = BASE_STEPS_PER_SEC;
  s.stepProgress = 0;
  s.grew = 0;
  s.flash = 0;
  s.deathReason = null;
  s.bonus = null;
  s.food = spawnFood(s);
  s.lastEatAt = -1e9;
}

function makeInitialSnake() {
  const cy = Math.floor(ROWS / 2);
  const startX = Math.floor(COLS / 2) - Math.floor(INITIAL_LENGTH / 2);
  const arr = [];
  for (let i = INITIAL_LENGTH - 1; i >= 0; i--) {
    arr.push({ x: startX + i, y: cy });
  }
  return arr;
}

export function queueDirection(s, next) {
  if (!next) return;
  const last = s.queued.length ? s.queued[s.queued.length - 1] : s.direction;
  if (next.x === -last.x && next.y === -last.y) return;
  if (next.x ===  last.x && next.y ===  last.y) return;
  if (s.queued.length < 2) s.queued.push(next);
}

export function tick(s, dt, events) {
  if (s.state !== "playing") return;

  if (s.bonus) {
    s.bonus.life += dt;
    if (s.bonus.life >= s.bonus.maxLife) s.bonus = null;
  }

  const stepDur = 1000 / s.stepsPerSec;
  s.stepProgress += dt;
  let safety = 4;
  while (s.stepProgress >= stepDur && safety-- > 0) {
    s.stepProgress -= stepDur;
    advance(s, events);
    if (s.state !== "playing") return;
  }
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 0.0015);
}

function advance(s, events) {
  if (s.queued.length) s.direction = s.queued.shift();

  s.prevSnake = s.snake.map(p => ({ ...p }));

  const head = s.snake[0];
  const next = { x: head.x + s.direction.x, y: head.y + s.direction.y };

  if (next.x < 0 || next.y < 0 || next.x >= s.cols || next.y >= s.rows) {
    s.state = "gameover";
    s.deathReason = "wall";
    if (events) events.die("wall");
    return;
  }

  const tailWillDrop = s.grew === 0;
  const limit = tailWillDrop ? s.snake.length - 1 : s.snake.length;
  for (let i = 0; i < limit; i++) {
    const seg = s.snake[i];
    if (seg.x === next.x && seg.y === next.y) {
      s.state = "gameover";
      s.deathReason = "self";
      if (events) events.die("self");
      return;
    }
  }

  s.snake.unshift(next);
  if (s.grew > 0) s.grew--;
  else s.snake.pop();

  if (s.food && next.x === s.food.x && next.y === s.food.y) {
    s.score += 10;
    s.foodEaten += 1;
    s.grew += 1;
    s.flash = 0.35;
    s.lastEatAt = performance.now();
    s.stepsPerSec = Math.min(MAX_STEPS_PER_SEC, BASE_STEPS_PER_SEC + s.foodEaten * SPEED_GROWTH);
    s.food = spawnFood(s);
    if (s.foodEaten % BONUS_EVERY === 0) {
      s.bonus = spawnBonus(s);
    }
    if (events) events.eat(false, next);
  } else if (s.bonus && next.x === s.bonus.x && next.y === s.bonus.y) {
    s.score += 50;
    s.grew += 2;
    s.flash = 0.55;
    s.lastEatAt = performance.now();
    s.bonus = null;
    if (events) events.eat(true, next);
  }
}

function spawnFood(s) {
  return spawnAt(s, true);
}
function spawnBonus(s) {
  return Object.assign(spawnAt(s, false), {
    life: 0,
    maxLife: BONUS_LIFETIME_MS,
    bonus: true,
  });
}
function spawnAt(s, allowAnywhere) {
  const free = [];
  const occupied = new Set(s.snake.map(p => p.x + ":" + p.y));
  if (s.food) occupied.add(s.food.x + ":" + s.food.y);
  if (s.bonus) occupied.add(s.bonus.x + ":" + s.bonus.y);
  for (let y = 0; y < s.rows; y++) {
    for (let x = 0; x < s.cols; x++) {
      if (!occupied.has(x + ":" + y)) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  const idx = Math.floor(Math.random() * free.length);
  return free[idx];
}

export function progressFraction(s) {
  const stepDur = 1000 / s.stepsPerSec;
  return Math.max(0, Math.min(1, s.stepProgress / stepDur));
}
