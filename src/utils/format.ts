export function formatMUsd(value: number) {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}B` : `$${Math.round(value)}M`
}

export function formatDuration(days: number) {
  return days >= 730 ? `${(days / 365).toFixed(1)} yr` : `${days} d`
}

export function formatPercent(ratio: number, digits = 0) {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

export function formatSignedWatts(value: number) {
  return `${value > 0 ? '+' : ''}${value} W`
}
