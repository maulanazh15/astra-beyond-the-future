import { ExternalLink } from 'lucide-react'
import { StatusBadge } from '../../components/common/StatusBadge'
import type { NasaSource } from '../../types/nasaSource'

const typeLabel: Record<NasaSource['sourceType'], string> = {
  dataset: 'Dataset',
  publication: 'Publication',
  'program-page': 'Program page',
}

export function SourceCard({ source }: { source: NasaSource }) {
  const verified = source.verification === 'verified'
  return (
    <article id={`src-${source.id}`} className="scroll-mt-20 rounded-lg border border-space-700 bg-space-800/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] tracking-wider text-cyan-400 uppercase">{source.missionOrInstrument}</p>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-start gap-1.5 font-medium text-slate-100 hover:text-cyan-300"
          >
            {source.title}
            <ExternalLink className="mt-1 size-3.5 shrink-0" aria-hidden />
          </a>
        </div>
        <StatusBadge
          tone={verified ? 'success' : 'neutral'}
          label={verified ? 'Values checked' : 'Link checked, no values used'}
        />
      </div>
      {source.citation && <p className="mt-2 text-xs text-slate-400 italic">{source.citation}</p>}
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-500">Organization</dt>
        <dd className="text-slate-300">{source.organization}</dd>
        <dt className="text-slate-500">Type</dt>
        <dd className="text-slate-300">{typeLabel[source.sourceType]}</dd>
        <dt className="text-slate-500">Accessed</dt>
        <dd className="font-mono text-slate-300">{source.accessedOn}</dd>
        <dt className="text-slate-500">Used in ASTRA</dt>
        <dd className="text-slate-300">{source.extracted}</dd>
        {source.gameVariables.length > 0 && (
          <>
            <dt className="text-slate-500">Game variables</dt>
            <dd className="flex flex-wrap gap-1.5">
              {source.gameVariables.map((v) => (
                <code key={v} className="rounded bg-space-950 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {v}
                </code>
              ))}
            </dd>
          </>
        )}
      </dl>
    </article>
  )
}
