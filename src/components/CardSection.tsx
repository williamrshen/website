import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import type { CardItem, OpenDetail } from '../data/types'
import { DetailContent } from './DetailContent'
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

const transitionName = (...parts: string[]) => parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '-')

/**
 * Animate a layout change with the View Transitions API where available.
 *
 * Only elements visible *before* the change get a view-transition-name. Elements that exist
 * only in the new state are layered above the whole page (including the fixed nav) during
 * the transition, so those are left in the root snapshot and use their own CSS entrance.
 */
function morph(elements: Map<string, HTMLElement>, prefix: string, update: () => void) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!('startViewTransition' in document) || reduceMotion) {
    update()
    return
  }
  const named = [...elements].filter(([, element]) => element.getClientRects().length > 0)
  for (const [key, element] of named) element.style.viewTransitionName = transitionName(prefix, key)
  document.startViewTransition(update).finished.finally(() => {
    for (const [, element] of named) element.style.viewTransitionName = ''
  })
}

export function CardSection({
  id, title, meta, items, itemNoun, onOpenDetail, initialCount = 3, layout = 'dialog', mirrored = false,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const extraId = useId()
  const panelId = useId()
  const panelTitleId = useId()
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  const itemsRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingId = `${id}-heading`
  const visible = items.slice(0, initialCount)
  const extra = items.slice(initialCount)
  const selected = layout === 'panel' ? items.find((item) => item.id === selectedId) ?? null : null
  const split = selected !== null

  // On entering the split view, make sure the chosen card is visible in the list
  // and the panel is on screen (it sits below the list on narrow viewports).
  useLayoutEffect(() => {
    if (!split || !selectedId) return
    const list = itemsRef.current
    const card = cardRefs.current.get(selectedId)
    if (list && card) {
      const listBox = list.getBoundingClientRect()
      const cardBox = card.getBoundingClientRect()
      if (cardBox.top < listBox.top || cardBox.bottom > listBox.bottom) list.scrollTop += cardBox.top - listBox.top - 8
    }
    const panel = panelRef.current
    if (panel && panel.getBoundingClientRect().top > window.innerHeight * 0.75) {
      panel.scrollIntoView({ block: 'start' })
    }
  }, [split, selectedId])

  const select = (item: CardItem) => {
    if (layout === 'dialog') {
      onOpenDetail(item.detail)
      return
    }
    if (split && item.id === selectedId) close()
    else if (split) setSelectedId(item.id)
    else morph(cardRefs.current, `${id}-card`, () => flushSync(() => setSelectedId(item.id)))
  }

  const close = () => {
    const card = selectedId ? cardRefs.current.get(selectedId) : undefined
    // Keep the extra cards open if the selection lives there, so focus can return to it.
    const inExtra = extra.some((item) => item.id === selectedId)
    morph(cardRefs.current, `${id}-card`, () => {
      flushSync(() => {
        setSelectedId(null)
        if (inExtra) setExpanded(true)
      })
      card?.focus({ preventScroll: true })
    })
  }

  const renderCard = (item: CardItem, index: number) => {
    const isSelected = split && item.id === selectedId
    return (
      <li key={item.id} style={{ '--i': index - initialCount } as CSSProperties}>
        <button
          ref={(element) => {
            if (element) cardRefs.current.set(item.id, element)
            else cardRefs.current.delete(item.id)
          }}
          className={styles.card}
          aria-current={isSelected ? 'true' : undefined}
          aria-controls={split ? panelId : undefined}
          onClick={() => select(item)}
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
        className={split ? styles.split : undefined}
        onKeyDown={(event) => {
          if (split && event.key === 'Escape') close()
        }}
      >
        <div className={styles.items} ref={itemsRef}>
          <ul className={styles.grid}>{visible.map(renderCard)}</ul>
          {extra.length > 0 && (
            <ul className={`${styles.grid} ${styles.extra}`} id={extraId} hidden={!expanded && !split}>
              {extra.map((item, index) => renderCard(item, index + initialCount))}
            </ul>
          )}
        </div>
        {selected && (
          <div
            className={styles.panel}
            id={panelId}
            ref={panelRef}
            role="region"
            aria-labelledby={panelTitleId}
          >
            <button className={styles.close} aria-label="Close details" onClick={close}>×</button>
            <div className={styles.panelBody} key={selected.id}>
              <DetailContent detail={selected.detail} titleId={panelTitleId} headingLevel={3} />
            </div>
          </div>
        )}
      </div>
      {extra.length > 0 && !split && (
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
