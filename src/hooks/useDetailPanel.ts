import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'

const transitionName = (...parts: string[]) => parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '-')

type MorphOptions = {
  /** Added as a view-transition-class, so CSS can style these elements' transition pseudo-elements. */
  transitionClass?: string
}

/**
 * Animate a layout change with the View Transitions API where available.
 *
 * Only elements visible *before* the change get a view-transition-name. Elements that exist
 * only in the new state are layered above the whole page (including the fixed nav) during
 * the transition, so those are left in the root snapshot and use their own CSS entrance.
 */
function morph(elements: Map<string, HTMLElement>, prefix: string, options: MorphOptions, update: () => void) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!('startViewTransition' in document) || reduceMotion) {
    update()
    return
  }
  const named = [...elements].filter(([, element]) => element.getClientRects().length > 0)
  for (const [key, element] of named) {
    element.style.viewTransitionName = transitionName(prefix, key)
    if (options.transitionClass) element.style.setProperty('view-transition-class', options.transitionClass)
  }
  document.startViewTransition(update).finished.finally(() => {
    for (const [, element] of named) {
      element.style.viewTransitionName = ''
      element.style.removeProperty('view-transition-class')
    }
  })
}

type Options = MorphOptions & {
  /** Runs in the same render as closing; e.g. to reveal the card that focus returns to. */
  onClose?: (id: string) => void
}

/**
 * Selection state for a "cards collapse into a side list + detail panel" layout.
 * Opening and closing morph the cards with a view transition; switching items swaps in place.
 */
export function useDetailPanel<T extends { id: string }>(items: T[], prefix: string, options: Options = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const panelId = useId()
  const panelTitleId = useId()
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const itemsRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = items.find((item) => item.id === selectedId) ?? null
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

  const close = () => {
    if (!selectedId) return
    const id = selectedId
    const card = cardRefs.current.get(id)
    morph(cardRefs.current, prefix, options, () => {
      flushSync(() => {
        setSelectedId(null)
        options.onClose?.(id)
      })
      card?.focus({ preventScroll: true })
    })
  }

  /** Open an item, switch to it, or close the panel if it is already selected. */
  const select = (id: string) => {
    if (split && id === selectedId) close()
    else if (split) setSelectedId(id)
    else morph(cardRefs.current, prefix, options, () => flushSync(() => setSelectedId(id)))
  }

  /** Ref callback for each card, so the morph and focus restore can find it. */
  const cardRef = (id: string) => (element: HTMLElement | null) => {
    if (element) cardRefs.current.set(id, element)
    else cardRefs.current.delete(id)
  }

  /** Props for each card's button. */
  const cardProps = (id: string) => ({
    ref: cardRef(id),
    'aria-current': split && id === selectedId ? ('true' as const) : undefined,
    'aria-controls': split ? panelId : undefined,
    onClick: () => select(id),
  })

  /** Props for the element wrapping the list and the panel. */
  const containerProps = {
    onKeyDown: (event: KeyboardEvent) => {
      if (split && event.key === 'Escape') close()
    },
  }

  return { selected, split, select, close, cardProps, containerProps, itemsRef, panelRef, panelId, panelTitleId }
}
