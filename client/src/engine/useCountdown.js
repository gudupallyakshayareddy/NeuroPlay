import { useEffect, useRef, useState } from 'react'

/** Countdown in seconds (tenths precision). Restarts when `resetKey` changes. Pauses when `running` is false. */
export default function useCountdown(seconds, { running = true, onEnd, resetKey = 0 } = {}) {
  const [left, setLeft] = useState(seconds)
  const endRef = useRef(onEnd)
  endRef.current = onEnd
  useEffect(() => { setLeft(seconds) }, [seconds, resetKey])
  useEffect(() => {
    if (!running) return
    const startedAt = Date.now()
    const startLeft = seconds
    let done = false
    const id = setInterval(() => {
      const remaining = Math.max(0, startLeft - (Date.now() - startedAt) / 1000)
      setLeft(remaining)
      if (remaining <= 0 && !done) { done = true; clearInterval(id); endRef.current?.() }
    }, 100)
    return () => clearInterval(id)
  }, [running, seconds, resetKey])
  return left
}
