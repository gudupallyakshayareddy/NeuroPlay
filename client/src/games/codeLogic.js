// Pure Code Breaker logic (kept separate so it can be unit-tested without a browser).
// Wordle-style per-position feedback: 'hit' right place, 'near' wrong place, 'miss' not in code.
export function feedback(secret, guess) {
  const res = guess.map(() => 'miss')
  const pool = {}
  secret.forEach((s, i) => { if (guess[i] === s) res[i] = 'hit'; else pool[s] = (pool[s] || 0) + 1 })
  guess.forEach((g, i) => { if (res[i] !== 'hit' && pool[g] > 0) { res[i] = 'near'; pool[g]-- } })
  return res
}
