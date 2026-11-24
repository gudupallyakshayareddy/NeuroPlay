// Tiny WebAudio sound effects (no audio files). Muted by default-off toggle in settings.
const KEY = 'neuroplay:sound'
let ctx = null
let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } })()
const listeners = new Set()

export const soundEnabled = () => enabled
export function setSound(on) {
  enabled = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
export function onSoundChange(l) { listeners.add(l); return () => listeners.delete(l) }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(freq, dur, type = 'sine', gain = 0.06, when = 0) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(gain, c.currentTime + when)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + when)
  o.stop(c.currentTime + when + dur + 0.02)
}

export function sfx(name) {
  if (!enabled) return
  try {
    switch (name) {
      case 'click': tone(520, 0.07, 'triangle', 0.04); break
      case 'good': tone(660, 0.1, 'sine', 0.05); tone(880, 0.12, 'sine', 0.05, 0.08); break
      case 'bad': tone(220, 0.16, 'sawtooth', 0.04); tone(160, 0.2, 'sawtooth', 0.04, 0.1); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.05, i * 0.11)); break
      case 'levelup': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'sine', 0.05, i * 0.09)); break
      case 'coin': tone(988, 0.06, 'square', 0.03); tone(1319, 0.1, 'square', 0.03, 0.06); break
      default: break
    }
  } catch { /* audio blocked: stay silent */ }
}