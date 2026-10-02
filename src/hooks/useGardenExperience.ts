import { useLayoutEffect, useRef } from 'react'
import { GardenScene } from '../garden/scene'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
type Controller = { setEvening: (value: boolean) => void; setDialogOpen: (value: boolean) => void }

/** Owns the animation lifecycle. Scroll/pointer frames update refs, not React renders. */
export function useGardenExperience(evening: boolean, dialogOpen: boolean) {
  const experience = useRef<HTMLDivElement>(null)
  const garden = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
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
    if (!root || !gardenElement || !canvasElement || !brandElement || !modeElement || !navElement || !hintElement || !cursorElement) return
    const context = canvasElement.getContext('2d')
    const scene = context ? new GardenScene(canvasElement, context) : null
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointerQuery = window.matchMedia('(pointer: fine)')
    let night = false, modalOpen = false, progress = 0, visibleHeight = 0
    let width = 0, height = 0, frame = 0

    const render = (time = 0) => scene?.render(time, night, motionQuery.matches)
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
      const modeStart = brandElement.offsetWidth / 2 + (width <= 680 ? 10 : 18)
      const modeEnd = width / 2 - brandInset - modeElement.offsetWidth
      const properties: Record<string, string | number> = {
        '--garden-height': `${visibleHeight}px`,
        '--header-height': `${(width <= 680 ? 104 : 132) * (1 - eased) + navHeight * eased}px`,
        '--brand-x': `${(brandInset - (width - brandElement.offsetWidth) / 2) * eased}px`,
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
      syncAnimation()
    }
    const resize = () => {
      width = canvasElement.clientWidth
      height = canvasElement.clientHeight
      scene?.resize()
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
      cursorElement.dataset.active = String(event.target instanceof Element && Boolean(event.target.closest('a,button')))
      const rect = canvasElement.getBoundingClientRect()
      scene?.setPointer({ x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height })
      if (motionQuery.matches) render()
    }
    const onScroll = () => { hideCursor(); updateScroll() }
    const onVisibility = () => { hideCursor(); syncAnimation() }
    const onMotionChange = () => { syncAnimation(); render() }

    controller.current = {
      setEvening(value) { night = value; render() },
      setDialogOpen(value) { modalOpen = value; if (value) hideCursor() },
    }
    resize()
    // ResizeObserver also catches viewport-unit changes from mobile browser chrome.
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvasElement)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', hideCursor)
    document.addEventListener('mouseleave', hideCursor)
    document.addEventListener('visibilitychange', onVisibility)
    motionQuery.addEventListener('change', onMotionChange)
    pointerQuery.addEventListener('change', hideCursor)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointerMove)
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

  return { experience, garden, canvas, brand, mode, navigation, hint, cursor }
}
