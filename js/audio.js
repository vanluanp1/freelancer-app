/* ============================================
   AUDIO.JS — Web Audio API sound effects
   ============================================ */

let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playTone(freq = 440, type = 'sine', duration = 0.3, volume = 0.3) {
  const settings = getSettings();
  if (!settings.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch(e) { /* ignore */ }
}

// Work session complete chime (pleasant ascending)
function playWorkComplete() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 'sine', 0.4, 0.25), i * 150);
  });
}

// Break complete chime (gentle descending)
function playBreakComplete() {
  const notes = [783.99, 659.25, 523.25];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 'sine', 0.3, 0.2), i * 120);
  });
}

// Tick sound for habit
function playHabitTick() {
  playTone(880, 'sine', 0.12, 0.15);
  setTimeout(() => playTone(1100, 'sine', 0.1, 0.12), 80);
}

// Task complete sound
function playTaskComplete() {
  playTone(523.25, 'sine', 0.15, 0.2);
  setTimeout(() => playTone(783.99, 'sine', 0.25, 0.2), 100);
}

// Error / warning tone
function playError() {
  playTone(220, 'sawtooth', 0.2, 0.15);
}
