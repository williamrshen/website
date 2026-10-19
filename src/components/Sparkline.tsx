import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { HISTORY_HEIGHT, clampWindow, historyChart, panWindow, zoomWindow, type IndexWindow } from '../data/history-chart'
import type { HistorySeries } from '../data/types'
import styles from './Sparkline.module.css'

type Props = { series: HistorySeries }
type ChartModel = NonNullable<ReturnType<typeof historyChart>>
type Drag = { pointerId: number; startX: number; startY: number; model: ChartModel; pan: boolean; moved: boolean }

const format = (value: number) => value.toLocaleString('en-US')

/**
 * A history chart you can inspect and zoom: hover (or arrow-key) to read a value, drag to
 * zoom into a range, Shift-drag to pan, Ctrl/Cmd + scroll to zoom at the cursor, and use
 * +/-/0 or the buttons. It mirrors the speedcubing progression chart, but spaces points
 * evenly by index since these series have several entries per day.
 */
export function Sparkline({ series }: Props) {
  const [view, setView] = useState<IndexWindow | null>(null)
  const [brush, setBrush] = useState<{ start: number; end: number; pan: boolean } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const [width, setWidth] = useState(600)
  const plotRef = useRef<HTMLDivElement>(null)
  const inspectorRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const id = useId()
  const clipId = `${id}-clip`.replace(/:/g, '')
  const gradientId = `${id}-fill`.replace(/:/g, '')

  const { points } = series
  const model = historyChart(series, view, width)
  const currentModel = useRef(model)
  const hasModel = model !== null
  useLayoutEffect(() => { currentModel.current = model })

  useLayoutEffect(() => {
    if (!hasModel) return
    const plot = plotRef.current
    if (!plot) return
    const update = () => setWidth(Math.max(200, Math.round(plot.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(plot)
    return () => observer.disconnect()
  }, [hasModel])

  useLayoutEffect(() => {
    if (!hasModel) return
    const element = inspectorRef.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || !event.deltaY || drag.current) return
      const chart = currentModel.current
      if (!chart) return
      event.preventDefault()
      const rectangle = element.getBoundingClientRect()
      const x = (event.clientX - rectangle.left) / rectangle.width * chart.width
      const anchor = Math.max(0, Math.min(1, (x - chart.left) / (chart.endX - chart.left)))
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rectangle.height : 1)
      setView(zoomWindow(chart.window, chart.count, Math.max(0.5, Math.min(2, Math.exp(delta * 0.002))), anchor))
      setActive(null)
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [hasModel])

  if (!model) return null

  const activePoint = active === null ? null : points[active]
  const activeDrawn = active === null ? null : model.drawn.find(item => item.index === active)
  const visible = points.slice(model.first, model.last + 1)
  const peak = visible.reduce((best, point) => (point.value > best.value ? point : best), visible[0])
  const first = points[0]
  const latest = points[points.length - 1]
  const allTimePeak = points.reduce((best, point) => (point.value > best.value ? point : best), first)
  const viewport = `${points[model.first].label} – ${points[model.last].label}`
  const description = `${series.label}: ${format(first.value)} on ${first.label}, ${format(latest.value)} on ${latest.label}, peak ${format(allTimePeak.value)}`

  function pointerX(event: PointerEvent<HTMLButtonElement>, chart: ChartModel) {
    const rectangle = event.currentTarget.getBoundingClientRect()
    return (event.clientX - rectangle.left) / Math.max(1, rectangle.width) * chart.width
  }

  function inspect(event: PointerEvent<HTMLButtonElement>) {
    if (!model) return
    const index = model.indexAtX(pointerX(event, model))
    setActive(Math.max(model.first, Math.min(model.last, Math.round(index))))
  }

  function cancelDrag() {
    const gesture = drag.current
    drag.current = null
    if (gesture?.pan && gesture.moved) setView(gesture.model.window)
    if (gesture && inspectorRef.current?.hasPointerCapture(gesture.pointerId)) inspectorRef.current.releasePointerCapture(gesture.pointerId)
    setBrush(null)
    setActive(null)
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!model || !event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    drag.current = {
      pointerId: event.pointerId, startX: pointerX(event, model), startY: event.clientY, model,
      pan: event.shiftKey && model.zoomed, moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    inspect(event)
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>) {
    const gesture = drag.current
    if (!gesture || gesture.pointerId !== event.pointerId) {
      if (event.pointerType === 'mouse') inspect(event)
      return
    }
    const x = pointerX(event, gesture.model)
    const distance = x - gesture.startX
    if (event.pointerType === 'touch' && Math.abs(event.clientY - gesture.startY) > Math.abs(distance) + 6) {
      cancelDrag()
      return
    }
    if (!gesture.moved && Math.abs(distance) < 6) return
    gesture.moved = true
    setActive(null)
    if (gesture.pan) {
      const { window, endX, left } = gesture.model
      setView(panWindow(window, gesture.model.count, -distance / (endX - left) * (window.end - window.start)))
    }
    setBrush({ start: gesture.startX, end: x, pan: gesture.pan })
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const gesture = drag.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setBrush(null)
    if (gesture.moved) {
      suppressClick.current = true
      if (!gesture.pan) setView(clampWindow({
        start: gesture.model.indexAtX(gesture.startX), end: gesture.model.indexAtX(pointerX(event, gesture.model)),
      }, gesture.model.count))
      setActive(null)
    } else inspect(event)
  }

  function zoom(factor: number) {
    setView(zoomWindow(model!.window, model!.count, factor))
    setActive(null)
  }

  function resetZoom() {
    cancelDrag()
    setView(null)
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    if (!model) return
    if (event.key === 'Escape' && drag.current) {
      event.stopPropagation()
      cancelDrag()
      suppressClick.current = true
    } else if (event.key === 'Escape' && active !== null) {
      event.stopPropagation()
      setActive(null)
    } else if (event.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      setView(panWindow(model.window, model.count, (model.window.end - model.window.start) * (event.key === 'ArrowLeft' ? -0.25 : 0.25)))
      setActive(null)
    } else if (!event.ctrlKey && !event.metaKey && ['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault()
      if (event.key === '0') resetZoom()
      else zoom(event.key === '-' ? 2 : 0.5)
    } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      setActive(current => event.key === 'Home' ? model.first : event.key === 'End' ? model.last
        : Math.max(model.first, Math.min(model.last, (current ?? model.last) + (event.key === 'ArrowLeft' ? -1 : 1))))
    }
    if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false
  }

  return (
    <figure className={styles.sparkline} aria-label={series.label}>
      <div className={styles.header}>
        <span className={styles.title}>{series.label}</span>
        <div className={styles.zoom} role="group" aria-label="Chart zoom">
          <button type="button" aria-label="Zoom out" title="Zoom out" disabled={!model.zoomed} onClick={() => zoom(2)}>−</button>
          <button type="button" aria-label="Zoom in" title="Zoom in"
            disabled={model.window.end - model.window.start <= model.minimumSpan + 1e-9} onClick={() => zoom(0.5)}>+</button>
          <button type="button" disabled={!model.zoomed} onClick={resetZoom}>Reset zoom</button>
        </div>
      </div>
      <p className={styles.peak}>{model.zoomed ? 'peak in view:' : 'peak:'} <b>{format(peak.value)}</b></p>
      <div className={styles.plot} ref={plotRef} data-view-start={model.window.start} data-view-end={model.window.end}>
        <svg className={styles.chart} viewBox={`0 0 ${width} ${HISTORY_HEIGHT}`} role="img" aria-label={description}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clipId}><rect x={model.left} y="0" width={model.endX - model.left} height={model.bottom + 1} /></clipPath>
          </defs>
          {model.yTicks.map((tick, index) => (
            <g key={index} aria-hidden="true">
              <line className={styles.grid} x1={model.left} x2={model.endX} y1={tick.y} y2={tick.y} />
              <text className={styles.axis} x={model.left - 7} y={tick.y + 3} textAnchor="end">{tick.label}</text>
            </g>
          ))}
          <g clipPath={`url(#${clipId})`}>
            <path d={model.fill} fill={`url(#${gradientId})`} />
            <path className={styles.line} d={model.line} fill="none" />
          </g>
          {activeDrawn && (
            <g aria-hidden="true">
              <line className={styles.guide} x1={activeDrawn.x} x2={activeDrawn.x} y1={16} y2={model.bottom} />
              <circle className={styles.activePoint} cx={activeDrawn.x} cy={activeDrawn.y} r="4" />
            </g>
          )}
          {brush && !brush.pan && <rect className={styles.brush}
            x={Math.max(model.left, Math.min(brush.start, brush.end))} y="16"
            width={Math.max(0, Math.min(model.endX, Math.max(brush.start, brush.end)) - Math.max(model.left, Math.min(brush.start, brush.end)))}
            height={model.bottom - 16} aria-hidden="true" />}
          {model.xTicks.map((tick, index) => (
            <text className={styles.axis} key={index} x={tick.x} y={HISTORY_HEIGHT - 8}
              textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'} aria-hidden="true">{tick.label}</text>
          ))}
        </svg>
        <button className={styles.inspector} ref={inspectorRef} type="button" aria-label={`Inspect ${series.label}`}
          aria-describedby={`${id}-selection`} aria-keyshortcuts="ArrowLeft ArrowRight Home End Shift+ArrowLeft Shift+ArrowRight"
          data-dragging={brush?.pan ? 'pan' : brush ? 'zoom' : undefined}
          onPointerMove={movePointer} onPointerDown={startDrag} onPointerUp={finishDrag}
          onPointerCancel={cancelDrag} onLostPointerCapture={() => { if (drag.current) cancelDrag() }}
          onPointerLeave={event => { if (event.pointerType === 'mouse' && !focused && !drag.current) setActive(null) }}
          onFocus={() => { setFocused(true); setActive(current => current ?? model.last) }}
          onBlur={() => { setFocused(false); setActive(null) }} onKeyDown={navigate}
          onClick={() => {
            if (suppressClick.current) { suppressClick.current = false; return }
            setActive(current => current ?? model.last)
          }} />
        {activePoint && (
          <div className={styles.tooltip} aria-hidden="true">
            <b>{format(activePoint.value)}</b>
            <span>{activePoint.label}</span>
          </div>
        )}
      </div>
      {model.zoomed && <span className={styles.viewport}>{viewport}</span>}
      <p className={styles.visuallyHidden} id={`${id}-selection`} aria-live="polite" aria-atomic="true">
        {activePoint ? `${series.label}: ${format(activePoint.value)} on ${activePoint.label}.`
          : `${description}. Drag horizontally to zoom into a range. Shift-drag or Shift-arrow keys pan. Control or Command plus scroll zooms at the cursor. Plus and minus zoom, zero resets. Left and right arrow keys inspect points; Home and End select the first and last in view.`}
      </p>
    </figure>
  )
}
