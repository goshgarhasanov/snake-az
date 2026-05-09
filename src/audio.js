const KEY = "snakeaz.sound";

export function createAudio() {
  let ctx = null;
  let muted = readMuted();

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = "sine", vol = 0.05, when = 0) {
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function sweep(from, to, dur, type = "sawtooth", vol = 0.06) {
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    isMuted: () => muted,
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (_) {}
    },
    eat()   { tone(680, 0.10, "triangle", 0.05); tone(960, 0.09, "triangle", 0.05, 0.06); },
    bonus() { tone(660, 0.10, "square", 0.05); tone(880, 0.10, "square", 0.05, 0.08); tone(1320, 0.14, "square", 0.05, 0.18); },
    die()   { sweep(440, 70, 0.55, "sawtooth", 0.07); },
    pause() { tone(440, 0.06, "sine", 0.04); },
    resume(){ tone(660, 0.06, "sine", 0.04); },
    start() { tone(880, 0.08, "triangle", 0.05); },
    resumeCtx() { ensure(); },
  };
}

function readMuted() {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? false : v === "1";
  } catch (_) { return false; }
}
