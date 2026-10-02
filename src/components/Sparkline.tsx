import { useId } from 'react'
import type { HistorySeries } from '../data/types'
import styles from './Sparkline.module.css'

type Props = {
  series: HistorySeries
  /** Compact sparklines omit the header and range labels. */
  compact?: boolean
}

const WIDTH = 600
const HEIGHT = 140
const PAD = 6

export function Sparkline({ series, compact = false }: Props) {
  const gradientId = useId()
  const { points } = series
  if (points.length < 2) return null

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const coordinates = points.map((point, index) => {
    const x = PAD + (index / (points.length - 1)) * (WIDTH - PAD * 2)
    const y = HEIGHT - PAD - ((point.value - min) / spread) * (HEIGHT - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const first = points[0]
  const latest = points[points.length - 1]
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), first)
  const format = (value: number) => value.toLocaleString('en-US')
  const description = `${series.label}: ${format(first.value)} on ${first.label}, ${format(latest.value)} on ${latest.label}, peak ${format(peak.value)}`

  const chart = (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={description}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${PAD},${HEIGHT - PAD} ${coordinates.join(' ')} ${WIDTH - PAD},${HEIGHT - PAD}`}
        fill={`url(#${CSS.escape(gradientId)})`}
      />
      <polyline className={styles.line} points={coordinates.join(' ')} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  )

  if (compact) return <div className={`${styles.sparkline} ${styles.compact}`}>{chart}</div>

  return (
    <div className={styles.sparkline}>
      <div className={styles.header}>
        <span>{series.label}</span>
        <span>peak {format(peak.value)}</span>
      </div>
      {chart}
      <div className={styles.range}><span>{first.label}</span><span>{latest.label}</span></div>
    </div>
  )
}
