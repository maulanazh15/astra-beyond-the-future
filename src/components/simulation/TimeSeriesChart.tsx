import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { chartTheme } from './chartTheme'

export type ChartSeries<T> = {
  key: keyof T & string
  name: string
  color: string
}

type TimeSeriesChartProps<T extends { day: number }> = {
  data: T[]
  series: ChartSeries<T>[]
  unit: string
  /** Fill under a single series. */
  area?: boolean
  yMax?: number
}

/** Day-indexed line/area chart. A legend is shown only for two or more series. */
export function TimeSeriesChart<T extends { day: number }>({ data, series, unit, area = false, yMax }: TimeSeriesChartProps<T>) {
  const gradientId = useId()
  const filled = area && series.length === 1

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-3 flex gap-4 text-xs text-slate-300" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            {filled && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series[0].color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={series[0].color} stopOpacity={0} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="day" type="number" domain={['dataMin', 'dataMax']} stroke={chartTheme.axis} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              domain={[0, yMax ?? 'auto']}
              stroke={chartTheme.axis}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={56}
              tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip cursor={{ stroke: chartTheme.cursor, strokeWidth: 1 }} content={(props) => <ChartTooltip {...props} unit={unit} />} />
            {series.map((s) =>
              filled ? (
                <Area key={s.key} type="monotone" dataKey={String(s.key)} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 4, stroke: chartTheme.surface, strokeWidth: 2 }} isAnimationActive={false} />
              ) : (
                <Line key={s.key} type="monotone" dataKey={String(s.key)} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: chartTheme.surface, strokeWidth: 2 }} isAnimationActive={false} />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
