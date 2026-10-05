import { useId, useState, type CSSProperties } from 'react'
import type { CardItem, OpenDetail } from '../data/types'
import { useDetailPanel } from '../hooks/useDetailPanel'
import { DetailPanel } from './DetailPanel'
import split from './DetailPanel.module.css'
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
  /**
   * `dialog` opens the shared modal. `panel` collapses the cards into a list on
   * the left and shows the selected item's details in a panel on the right.
   */
  layout?: 'dialog' | 'panel'
  /** Swap sides: heading title and card column on the right, meta and detail panel on the left. */
  mirrored?: boolean
}

export function CardSection({
  id, title, meta, items, itemNoun, onOpenDetail, initialCount = 3, layout = 'dialog', mirrored = false,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const extraId = useId()
  const headingId = `${id}-heading`
  const visible = items.slice(0, initialCount)
  const extra = items.slice(initialCount)
  const panel = useDetailPanel(layout === 'panel' ? items : [], `${id}-card`, {
    // Keep the extra cards open if the selection lives there, so focus can return to it.
    onClose: (closedId) => {
      if (extra.some((item) => item.id === closedId)) setExpanded(true)
    },
  })
  const { selected, split: isSplit, itemsRef, panelRef } = panel

  const renderCard = (item: CardItem, index: number) => {
    const cardProps = panel.cardProps(item.id)
    return (
      <li key={item.id} style={{ '--i': index - initialCount } as CSSProperties}>
        <button
          {...cardProps}
          className={styles.card}
          onClick={layout === 'panel' ? cardProps.onClick : () => onOpenDetail(item.detail)}
        >
          <span className={styles.visual} data-tone={index % 3}>
            {item.visual.type === 'image'
              ? <img src={item.visual.src} alt="" />
              : <span className={styles.monogram} aria-hidden="true">{item.visual.text}</span>}
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.summary}>{item.summary}</span>
          </span>
          <span className={styles.arrow} aria-hidden="true">{layout === 'panel' ? '→' : '↗'}</span>
        </button>
      </li>
    )
  }

  return (
    <section
      className={mirrored ? `${styles.section} ${styles.mirrored}` : styles.section}
      id={id}
      aria-labelledby={headingId}
    >
      <div className={styles.heading}>
        <h2 id={headingId}>{title}</h2>
        <span>{meta}</span>
      </div>
      <div
        className={isSplit ? `${split.split} ${styles.split} ${mirrored ? split.mirrored : ''}` : undefined}
        {...panel.containerProps}
      >
        <div className={split.items} ref={itemsRef}>
          <ul className={styles.grid}>{visible.map(renderCard)}</ul>
          {extra.length > 0 && (
            <ul className={`${styles.grid} ${styles.extra}`} id={extraId} hidden={!expanded && !isSplit}>
              {extra.map((item, index) => renderCard(item, index + initialCount))}
            </ul>
          )}
        </div>
        {selected && (
          <DetailPanel
            detail={selected.detail}
            itemKey={selected.id}
            id={panel.panelId}
            titleId={panel.panelTitleId}
            panelRef={panelRef}
            onClose={panel.close}
          />
        )}
      </div>
      {extra.length > 0 && !isSplit && (
        <button
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={extraId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? `Show fewer ${itemNoun}` : `Show all ${items.length} ${itemNoun}`}
          <span className={styles.chevron} aria-hidden="true">↓</span>
        </button>
      )}
    </section>
  )
}
