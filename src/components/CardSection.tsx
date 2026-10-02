import { useId, useState, type CSSProperties } from 'react'
import type { CardItem, OpenDetail } from '../data/types'
import styles from './CardSection.module.css'

type Props = {
  id: string
  title: string
  meta: string
  items: CardItem[]
  /** Plural noun used by the expand control, e.g. "projects". */
  itemNoun: string
  onOpenDetail: OpenDetail
  initialCount?: number
}

export function CardSection({ id, title, meta, items, itemNoun, onOpenDetail, initialCount = 3 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const extraId = useId()
  const headingId = `${id}-heading`
  const visible = items.slice(0, initialCount)
  const extra = items.slice(initialCount)

  const renderCard = (item: CardItem, index: number) => (
    <li key={item.id} style={{ '--i': index - initialCount } as CSSProperties}>
      <button className={styles.card} onClick={() => onOpenDetail(item.detail)}>
        <span className={styles.visual} data-tone={index % 3}>
          {item.visual.type === 'image'
            ? <img src={item.visual.src} alt="" />
            : <span className={styles.monogram} aria-hidden="true">{item.visual.text}</span>}
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{item.title}</span>
          <span className={styles.summary}>{item.summary}</span>
        </span>
        <span className={styles.arrow} aria-hidden="true">↗</span>
      </button>
    </li>
  )

  return (
    <section className={styles.section} id={id} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h2 id={headingId}>{title}</h2>
        <span>{meta}</span>
      </div>
      <ul className={styles.grid}>{visible.map(renderCard)}</ul>
      {extra.length > 0 && (
        <>
          <ul className={`${styles.grid} ${styles.extra}`} id={extraId} hidden={!expanded}>
            {extra.map((item, index) => renderCard(item, index + initialCount))}
          </ul>
          <button
            className={styles.toggle}
            aria-expanded={expanded}
            aria-controls={extraId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? `Show fewer ${itemNoun}` : `Show all ${items.length} ${itemNoun}`}
            <span className={styles.chevron} aria-hidden="true">↓</span>
          </button>
        </>
      )}
    </section>
  )
}
