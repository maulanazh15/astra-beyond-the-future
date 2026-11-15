import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** Whether the element is on screen. Used to stop rendering a 3D scene the player scrolled past. */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '100px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return inView
}
