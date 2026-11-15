import { RotateCcw, TriangleAlert } from 'lucide-react'

type ErrorFallbackProps = {
  message: string
  /** Offer a retry when the failure may be temporary (e.g. a lost WebGL context). */
  onRetry?: () => void
}

/** Replaces a 3D view that cannot render. The rest of the screen keeps working. */
export function ErrorFallback({ message, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-space-950 p-6 text-center text-sm text-slate-400" role="alert">
      <TriangleAlert className="size-7 text-amber-400" aria-hidden />
      <p className="max-w-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-space-600 bg-space-800 px-3 py-1.5 text-xs text-slate-100 hover:border-cyan-500/60"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Try again
        </button>
      )}
    </div>
  )
}
