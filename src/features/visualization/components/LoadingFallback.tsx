import { Orbit } from 'lucide-react'

/** Shown while the 3D code chunk loads and the terrain is generated. Plain DOM, no WebGL needed. */
export function LoadingFallback({ label = 'Preparing lunar surface…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-space-950 text-sm text-slate-400 ${className}`} role="status">
      <Orbit className="size-7 animate-spin text-cyan-400 [animation-duration:3s] motion-reduce:animate-none" aria-hidden />
      {label}
    </div>
  )
}
