import { useEffect, useState } from 'react'

const TICK_MS = 100

/**
 * A 0–1 playhead that advances in real time while playing and stops at the end. Ticks ten times a
 * second: the 3D models ease between ticks, so motion stays smooth without re-rendering every frame.
 */
export function usePlayback(durationS: number, initial = 1) {
  const [t, setT] = useState(initial)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setT((prev) => {
        const next = Math.min(1, prev + TICK_MS / 1000 / durationS)
        if (next >= 1) setPlaying(false)
        return next
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, durationS])

  return {
    t,
    playing,
    /** Plays from the current point, or from the start if already at the end. */
    play: () => {
      setT((prev) => (prev >= 1 ? 0 : prev))
      setPlaying(true)
    },
    pause: () => setPlaying(false),
    seek: (value: number) => {
      setPlaying(false)
      setT(Math.min(1, Math.max(0, value)))
    },
  }
}
