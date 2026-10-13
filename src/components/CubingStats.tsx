import { useId } from 'react'
import { getCubingEvents, type CubingSnapshot, type CubingSource } from '../data/cubing'
import type { Stat } from '../data/types'
import styles from './CubingStats.module.css'

type ControlsProps = {
  source: CubingSource
  eventId: string
  snapshot: CubingSnapshot
  onSourceChange: (source: CubingSource) => void
  onEventChange: (eventId: string) => void
  emptyMessage: string | null
  announcement: string
}

export function CubingControls({ source, eventId, snapshot, onSourceChange, onEventChange, emptyMessage, announcement }: ControlsProps) {
  const selectId = useId()
  return (
    <>
      <div className={styles.controls}>
        <div className={styles.sources} role="group" aria-label="Cubing results source">
          <button type="button" aria-pressed={source === 'official'} onClick={() => onSourceChange('official')}>Official</button>
          <button type="button" aria-pressed={source === 'unofficial'} onClick={() => onSourceChange('unofficial')}>Unofficial</button>
        </div>
        <div className={styles.event}>
          <label htmlFor={selectId}>Event</label>
          <select id={selectId} value={eventId} onChange={event => onEventChange(event.target.value)}>
            {getCubingEvents(snapshot).map(event => <option key={event.id} value={event.id}>{event.label}</option>)}
          </select>
        </div>
      </div>
      {emptyMessage && <p className={styles.empty}>{emptyMessage}</p>}
      <span className={styles.visuallyHidden} role="status" aria-atomic="true">{announcement}</span>
    </>
  )
}

export function CubingExtras({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null
  return (
    <div className={styles.extraSection}>
      <dl className={styles.extras}>
        {stats.map(stat => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
