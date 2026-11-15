import { TriangleAlert, Wrench, X } from 'lucide-react'
import { describeDesignIssue } from './designIssueText'
import type { SpacecraftDesign } from './useSpacecraftDesign'

/** Warns when a saved design no longer fits the current data, and offers a repair. */
export function DesignCompatibilityNotice({ design }: { design: SpacecraftDesign }) {
  const { issues, loadNotices } = design
  if (issues.length === 0 && loadNotices.length === 0) return null

  return (
    <section role="alert" className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-amber-200">
          <TriangleAlert className="size-4" aria-hidden />
          {issues.length > 0 ? 'Saved design no longer fits the current component limits' : 'Saved design was updated'}
        </p>
        {issues.length > 0 ? (
          <button
            type="button"
            onClick={design.repair}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/10"
          >
            <Wrench className="size-3.5" aria-hidden />
            Repair design
          </button>
        ) : (
          <button
            type="button"
            onClick={design.dismissLoadNotices}
            aria-label="Dismiss notice"
            className="text-slate-400 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-6 text-xs text-slate-300">
        {issues.map((issue) => (
          <li key={issue.kind === 'unknownComponent' ? issue.componentId : issue.category}>{describeDesignIssue(issue)}</li>
        ))}
        {loadNotices.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
      {issues.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          Remove parts yourself, or use Repair to drop unavailable parts and the most recently added extra units. Launch is
          blocked until the design fits.
        </p>
      )}
    </section>
  )
}
