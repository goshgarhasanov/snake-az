import { DIR } from "./game.js";

export function bindInput(canvas, dpad, callbacks) {
  const onDir   = callbacks.onDirection || (() => {});
  const onPause = callbacks.onPause     || (() => {});
  const onStart = callbacks.onStart     || (() => {});
  const onAny   = callbacks.onAny       || (() => {});

  function handleKey(e) {
    const k = e.key;
    let dir = null;
    if (k === "ArrowUp" || k === "w" || k === "W")    dir = DIR.up;
    else if (k === "ArrowDown" || k === "s" || k === "S")  dir = DIR.down;
    else if (k === "ArrowLeft" || k === "a" || k === "A")  dir = DIR.left;
    else if (k === "ArrowRight" || k === "d" || k === "D") dir = DIR.right;

    if (dir) {
      e.preventDefault();
      onAny();
      onDir(dir);
      return;
    }

    if (k === " " || k === "Spacebar" || k === "p" || k === "P") {
      e.preventDefault();
      onPause();
      return;
    }

    if (k === "Enter" || k === "r" || k === "R") {
      onStart();
    }
  }
  window.addEventListener("keydown", handleKey, { passive: false });

  let touch = null;
  const SWIPE_THRESHOLD = 22;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    canvas.setPointerCapture?.(e.pointerId);
    touch = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: false };
    onAny();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    if (touch.moved) return;
    if (Math.abs(dx) >= SWIPE_THRESHOLD || Math.abs(dy) >= SWIPE_THRESHOLD) {
      touch.moved = true;
      const dir = pickDir(dx, dy);
      if (dir) onDir(dir);
    }
  });

  function endTouch(e) {
    if (!touch || e.pointerId !== touch.id) return;
    if (!touch.moved) {
      const dt = performance.now() - touch.t;
      if (dt < 280) onStart();
    }
    touch = null;
  }
  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointercancel", endTouch);

  if (dpad) {
    const handle = (e) => {
      const btn = e.target.closest("[data-dir]");
      if (!btn) return;
      e.preventDefault();
      const dir = btn.getAttribute("data-dir");
      const map = { up: DIR.up, down: DIR.down, left: DIR.left, right: DIR.right };
      if (map[dir]) {
        onAny();
        onDir(map[dir]);
      }
    };
    dpad.addEventListener("pointerdown", handle);
  }
}

function pickDir(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? DIR.right : DIR.left;
  }
  return dy > 0 ? DIR.down : DIR.up;
}
