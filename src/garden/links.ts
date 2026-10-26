import type { GardenScene } from './scene.ts'
import type { Point } from './types.ts'

type Options = {
  scene: GardenScene
  /** Laid over the canvas with the same transform; holds one link per destination. */
  container: HTMLElement
  /** Floating label naming the highlighted destination. */
  label: HTMLElement
  /** Class for the generated links. */
  className: string
  /** Draws a frame so a highlight change shows even while the animation is paused. */
  redraw(): void
}

/**
 * Makes linked garden objects work like links.
 * - Mouse: hovering lights the object up and shows its label; clicking follows the link.
 * - Touch: the first tap lights it up and shows the label, a second tap on it follows the link.
 * - Keyboard and screen readers: each destination is a real `<a>` positioned over its objects,
 *   reached with Tab; focusing one lights the objects up and draws a focus ring around them.
 * Navigation always goes through those links, so it scrolls exactly like the site's other links.
 */
export function gardenLinks({ scene, container, label, className, redraw }: Options) {
  const anchors = new Map<string, HTMLAnchorElement>()
  let hovered: string | null = null, armed: string | null = null, focused: string | null = null, ring = false
  let shown: string | null = null

  function apply() {
    const link = focused ?? armed ?? hovered
    scene.setHighlight(link, link !== null && link === focused && ring)
    const shape = link ? scene.linkOutline(link) : null
    if (link && shape) {
      // Centered under the objects, kept clear of the screen edges and the scroll hint.
      const width = container.clientWidth, height = container.clientHeight
      label.textContent = `${scene.built.links[link].label} →`
      label.style.left = `${Math.min(Math.max(shape.label.x, 80), width - 80)}px`
      label.style.top = `${Math.min(shape.label.y, height - 130)}px`
    }
    label.dataset.visible = String(Boolean(link && shape))
    if (link !== shown) container.dataset.highlight = link ?? ''
    shown = link
    redraw()
  }

  /** Creates, updates, and positions the links; call after a resize or config change. */
  function sync() {
    const links = scene.activeLinks
    for (const [id, anchor] of anchors) {
      if (!links.some((link) => link.id === id)) { anchor.remove(); anchors.delete(id) }
    }
    for (const link of links) {
      let anchor = anchors.get(link.id)
      if (!anchor) {
        const created = document.createElement('a')
        created.className = className
        created.dataset.gardenLink = link.id
        created.addEventListener('focus', () => { focused = link.id; ring = created.matches(':focus-visible'); apply() })
        created.addEventListener('blur', () => { if (focused === link.id) focused = null; apply() })
        anchors.set(link.id, anchor = created)
      }
      anchor.href = link.href
      anchor.textContent = link.label
      // Keep links in config order (the order they're tabbed through), before the label.
      container.insertBefore(anchor, label)
      const shape = scene.linkOutline(link.id)
      if (shape) {
        const { left, top, right, bottom } = shape.bounds
        Object.assign(anchor.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` })
      }
    }
    for (const id of [hovered, armed, focused]) if (id && !anchors.has(id)) clear()
    apply()
  }

  function clear() {
    hovered = armed = focused = null
  }

  function follow(link: string) {
    hovered = armed = null
    apply()
    anchors.get(link)?.click()
  }

  return {
    sync,
    /** Mouse hover at a canvas point (or `null` when the pointer left); returns the link under it. */
    hover(point: Point | null) {
      const link = point ? scene.linkAt(point) ?? null : null
      if (link !== hovered) { hovered = link; apply() }
      return link
    },
    /** A click or tap at a canvas point. */
    click(point: Point, pointerType: string) {
      const link = scene.linkAt(point) ?? null
      if (!link) { if (armed) { armed = null; apply() } return }
      if (pointerType === 'touch' && armed !== link) { armed = link; apply(); return }
      follow(link)
    },
    /** Forgets the touch highlight, e.g. once the page scrolls. */
    disarm() { if (armed) { armed = null; apply() } },
    /** Links are unreachable once the garden has shrunk into the navigation bar. */
    setEnabled(enabled: boolean) {
      if (container.inert === !enabled) return
      container.inert = !enabled
      if (!enabled) { clear(); apply() }
    },
    destroy() {
      for (const anchor of anchors.values()) anchor.remove()
      anchors.clear()
      clear()
      scene.setHighlight(null)
      label.dataset.visible = 'false'
    },
  }
}
