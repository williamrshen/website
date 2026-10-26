import { useLayoutEffect, useRef } from 'react'
import { garden as gardenConfig, gardenPalettes, gardenSeasons } from '../data/garden'
import { gardenLinks } from '../garden/links'
import { currentSeason } from '../garden/seasons'
import { GardenScene } from '../garden/scene'

if (import.meta.env.DEV) {
  // This module re-runs whenever src/data/garden.ts is saved; hand the new config to the
  // running garden. Dead code in production builds.
  void import('../garden/dev/hot.ts').then(({ applyGardenModule }) => applyGardenModule(gardenConfig, gardenPalettes))
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
type Controller = { setEvening: (value: boolean) => void; setDialogOpen: (value: boolean) => void }

/** Owns the animation lifecycle. Scroll/pointer frames update refs, not React renders. */
export function useGardenExperience(evening: boolean, dialogOpen: boolean, classNames: { target: string }) {
  const experience = useRef<HTMLDivElement>(null)
  const garden = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const targets = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const targetClass = useRef(classNames.target)
  const brand = useRef<HTMLAnchorElement>(null)
  const mode = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const hint = useRef<HTMLAnchorElement>(null)
  const cursor = useRef<HTMLDivElement>(null)
  const controller = useRef<Controller | null>(null)

  useLayoutEffect(() => {
    const root = experience.current, gardenElement = garden.current, canvasElement = canvas.current
    const brandElement = brand.current, modeElement = mode.current, navElement = navigation.current
    const hintElement = hint.current, cursorElement = cursor.current
    const targetsElement = targets.current, labelElement = label.current
    if (!root || !gardenElement || !canvasElement || !brandElement || !modeElement || !navElement || !hintElement || !cursorElement) return
    if (!targetsElement || !labelElement) return
    const context = canvasElement.getContext('2d')
    const scene = context ? new GardenScene(canvasElement, context, gardenConfig) : null
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointerQuery = window.matchMedia('(pointer: fine)')
    let night = false, modalOpen = false, progress = 0, visibleHeight = 0
    let width = 0, height = 0, frame = 0

    let palettes = gardenPalettes, config = gardenConfig
    const season = gardenSeasons[currentSeason(location.search, new Date())]
    const palette = () => palettes[night ? season.evening : season.daylight]
    const render = (time = 0) => scene?.render(time, palette(), motionQuery.matches)
    // The oak, pines, and creek link to sections of the page.
    const links = scene && gardenLinks({
      scene, container: targetsElement, label: labelElement, className: targetClass.current,
      redraw: () => render(performance.now()),
    })
    /** Canvas CSS pixels under a client point, undoing the scroll-driven transform. */
    const canvasPoint = (event: MouseEvent) => {
      const rect = canvasElement.getBoundingClientRect()
      return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height }
    }
    const animate = (time: number) => {
      frame = 0
      if (document.hidden || progress >= 1 || motionQuery.matches) return
      render(time)
      frame = requestAnimationFrame(animate)
    }
    const syncAnimation = () => {
      if (document.hidden || progress >= 1 || motionQuery.matches) {
        cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame && scene) frame = requestAnimationFrame(animate)
      if (motionQuery.matches && !document.hidden) render()
    }
    const hideCursor = () => {
      scene?.setPointer(null)
      links?.hover(null)
      cursorElement.style.opacity = '0'
      delete document.body.dataset.gardenCursor
      if (motionQuery.matches) render()
    }
    const updateScroll = () => {
      const navHeight = parseFloat(getComputedStyle(root).getPropertyValue('--nav-height'))
      progress = clamp(window.scrollY / Math.max(1, gardenElement.offsetHeight - navHeight))
      const eased = smooth(progress)
      visibleHeight = Math.max(navHeight, gardenElement.offsetHeight - window.scrollY)
      const brandInset = width * (width <= 680 ? 0.06 : 0.07)
      const gap = width <= 680 ? 10 : 18
      // Brand and toggle start centered as one group, then split to the bar edges.
      const brandStart = -(modeElement.offsetWidth + gap) / 2
      const brandEnd = brandInset - (width - brandElement.offsetWidth) / 2
      const modeStart = brandElement.offsetWidth / 2 + gap + brandStart
      const modeEnd = width / 2 - brandInset - modeElement.offsetWidth
      const properties: Record<string, string | number> = {
        '--garden-height': `${visibleHeight}px`,
        '--header-height': `${(width <= 680 ? 104 : 132) * (1 - eased) + navHeight * eased}px`,
        '--brand-x': `${brandStart + (brandEnd - brandStart) * eased}px`,
        '--mode-x': `${modeStart + (modeEnd - modeStart) * eased}px`,
        '--scene-scale': 1 - 0.88 * eased,
        '--scene-y': `${(navHeight / 2 - height * 0.5 * 0.12) * eased + height * 0.04 * Math.sin(progress * Math.PI)}px`,
        '--scene-opacity': 1 - smooth((progress - 0.48) / 0.49),
        '--bar-opacity': smooth((progress - 0.42) / 0.58),
        '--hint-opacity': 1 - smooth(progress / 0.18),
        '--nav-opacity': smooth((progress - 0.8) / 0.2),
      }
      for (const [property, value] of Object.entries(properties)) root.style.setProperty(property, String(value))
      root.dataset.navReady = String(progress > 0.8)
      navElement.inert = progress <= 0.8
      hintElement.inert = progress > 0.18
      canvasElement.setAttribute('aria-hidden', String(progress >= 0.97))
      links?.setEnabled(progress < 0.97)
      syncAnimation()
    }
    const resize = () => {
      width = canvasElement.clientWidth
      height = canvasElement.clientHeight
      scene?.resize()
      links?.sync()
      hideCursor()
      updateScroll()
      render()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !pointerQuery.matches) { hideCursor(); return }
      if (event.clientY > visibleHeight || progress >= 0.97 || modalOpen) { hideCursor(); return }
      document.body.dataset.gardenCursor = 'true'
      cursorElement.style.opacity = '1'
      cursorElement.style.left = `${event.clientX}px`
      cursorElement.style.top = `${event.clientY}px`
      const point = canvasPoint(event)
      scene?.setPointer(point)
      // Over the canvas, the link under the pointer; elsewhere (header, hint) the element's own.
      const link = event.target === canvasElement ? links?.hover(point) : links?.hover(null)
      cursorElement.dataset.active = String(Boolean(link) || (event.target instanceof Element && Boolean(event.target.closest('a,button'))))
      if (motionQuery.matches) render()
    }
    const onClick = (event: MouseEvent) => {
      if (progress >= 0.97 || modalOpen) return
      // Clicks are PointerEvents in current browsers; older ones report a mouse.
      const pointerType = 'pointerType' in event && typeof event.pointerType === 'string' && event.pointerType ? event.pointerType : 'mouse'
      links?.click(canvasPoint(event), pointerType)
    }
    const onScroll = () => { hideCursor(); links?.disarm(); updateScroll() }
    const onVisibility = () => { hideCursor(); syncAnimation() }
    const onMotionChange = () => { syncAnimation(); render() }

    // Development-only tools (debug overlay, editor…). Dead code in production builds.
    let disposed = false, detachDevTools: (() => void) | undefined
    if (import.meta.env.DEV && scene) {
      void import('../garden/dev/index.ts').then(({ attachDevTools }) => {
        if (disposed) return
        detachDevTools = attachDevTools({
          scene, canvas: canvasElement, palette, palettes: () => palettes, config: () => config,
          requestRender: () => render(performance.now()),
          setGarden(nextConfig, nextPalettes) {
            scene.setConfig(nextConfig)
            links?.sync()
            config = nextConfig
            palettes = nextPalettes
            scene.invalidate()
            render(performance.now())
          },
        })
      })
    }

    controller.current = {
      // The wordmark changes width with the theme, so re-measure the header.
      setEvening(value) { night = value; updateScroll(); render() },
      setDialogOpen(value) { modalOpen = value; if (value) hideCursor() },
    }
    resize()
    // ResizeObserver also catches viewport-unit changes from mobile browser chrome.
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvasElement)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    canvasElement.addEventListener('click', onClick)
    window.addEventListener('blur', hideCursor)
    document.addEventListener('mouseleave', hideCursor)
    document.addEventListener('visibilitychange', onVisibility)
    motionQuery.addEventListener('change', onMotionChange)
    pointerQuery.addEventListener('change', hideCursor)

    return () => {
      disposed = true
      detachDevTools?.()
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointerMove)
      canvasElement.removeEventListener('click', onClick)
      links?.destroy()
      window.removeEventListener('blur', hideCursor)
      document.removeEventListener('mouseleave', hideCursor)
      document.removeEventListener('visibilitychange', onVisibility)
      motionQuery.removeEventListener('change', onMotionChange)
      pointerQuery.removeEventListener('change', hideCursor)
      hideCursor()
      controller.current = null
    }
  }, [])

  useLayoutEffect(() => { controller.current?.setEvening(evening) }, [evening])
  useLayoutEffect(() => { controller.current?.setDialogOpen(dialogOpen) }, [dialogOpen])

  return { experience, garden, canvas, targets, label, brand, mode, navigation, hint, cursor }
}
