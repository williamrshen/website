import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { CHART_HEIGHT, clampTimeWindow, panTimeWindow, progressionChart, zoomTimeWindow, type TimeWindow } from '../data/cubing-chart'
import { formatCubingDate, formatCubingTime, type ProgressionHistory, type ProgressionMetric, type ProgressionPoint } from '../data/cubing'
import styles from './CubingProgression.module.css'

type Props = {
  histories: Partial<Record<ProgressionMetric, ProgressionHistory>>
  metrics: ProgressionMetric[]
  updatedAt: string | null
}

const metricNames = { single: 'Single', mo3: 'Mo3', ao5: 'Ao5', ao12: 'Ao12', ao50: 'Ao50', ao100: 'Ao100', ao1000: 'Ao1000' }
type ChartModel = NonNullable<ReturnType<typeof progressionChart>>
type Drag = { pointerId: number; startX: number; startY: number; model: ChartModel; pan: boolean; moved: boolean }

function recordDescription(point: ProgressionPoint) {
  const date = point.competitionFrom
    ? [formatCubingDate(point.competitionFrom), point.competitionTill !== point.competitionFrom ? formatCubingDate(point.competitionTill) : null]
      .filter(Boolean).join(' – ')
    : formatCubingDate(point.timestamp)
  return [date, point.competitionName ?? point.sessionName].filter(Boolean).join(' · ')
}

export function CubingProgression({ histories, metrics, updatedAt }: Props) {
  const [metric, setMetric] = useState<ProgressionMetric>(metrics[0] ?? 'single')
  const [view, setView] = useState<TimeWindow | null>(null)
  const [brush, setBrush] = useState<{ start: number; end: number; pan: boolean } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const [width, setWidth] = useState(600)
  const plotRef = useRef<HTMLDivElement>(null)
  const inspectorRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const id = useId()
  const selected = metrics.includes(metric) ? metric : metrics[0] ?? 'single'
  const history = histories[selected]
  const points = history?.points ?? []
  const model = progressionChart(points, view, updatedAt, width)
  const currentModel = useRef(model)
  const hasModel = model !== null
  const selectedPoint = active === null ? null : model?.coordinates[active]?.point ?? null
  const activeCoordinate = active === null ? null : model?.coordinates[active]
  const label = history?.kind === 'custom' ? `Custom ${metricNames[selected]}` : metricNames[selected]
  const latest = points.at(-1)
  const visiblePB = model?.coordinates.at(-1)?.point ?? latest

  useLayoutEffect(() => { currentModel.current = model })

  useLayoutEffect(() => {
    if (!hasModel) return
    const plot = plotRef.current
    if (!plot) return
    const update = () => setWidth(Math.max(160, Math.round(plot.getBoundingClientRect().width)))
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
      setView(zoomTimeWindow(chart.window, chart.extent, Math.max(0.5, Math.min(2, Math.exp(delta * 0.002))), anchor))
      setActive(null)
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [hasModel])

  function pointerX(event: PointerEvent<HTMLButtonElement>, chart: ChartModel) {
    const rectangle = event.currentTarget.getBoundingClientRect()
    return (event.clientX - rectangle.left) / Math.max(1, rectangle.width) * chart.width
  }

  function inspect(event: PointerEvent<HTMLButtonElement>) {
    if (!model) return
    const x = pointerX(event, model)
    let nearest = 0
    for (let index = 1; index < model.coordinates.length; index++) {
      if (Math.abs(model.coordinates[index].x - x) < Math.abs(model.coordinates[nearest].x - x)) nearest = index
    }
    setActive(nearest)
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
    const x = pointerX(event, model)
    drag.current = { pointerId: event.pointerId, startX: x, startY: event.clientY, model, pan: event.shiftKey && model.zoomed, moved: false }
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
      const delta = -distance / (gesture.model.endX - gesture.model.left) * (gesture.model.window.end - gesture.model.window.start)
      setView(panTimeWindow(gesture.model.window, gesture.model.extent, delta))
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
      if (!gesture.pan) setView(clampTimeWindow({
        start: gesture.model.dateAtX(gesture.startX), end: gesture.model.dateAtX(pointerX(event, gesture.model)),
      }, gesture.model.extent))
      setActive(null)
    } else inspect(event)
  }

  function zoom(factor: number) {
    if (!model) return
    setView(zoomTimeWindow(model.window, model.extent, factor))
    setActive(null)
  }

  function resetZoom() {
    cancelDrag()
    setView(null)
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    if (!model) return
    const last = model.coordinates.length - 1
    if (event.key === 'Escape' && drag.current) {
      event.stopPropagation()
      cancelDrag()
      suppressClick.current = true
    } else if (event.key === 'Escape' && active !== null) {
      event.stopPropagation()
      setActive(null)
    } else if (event.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      setView(panTimeWindow(model.window, model.extent, (model.window.end - model.window.start) * (event.key === 'ArrowLeft' ? -0.25 : 0.25)))
      setActive(null)
    } else if (!event.ctrlKey && !event.metaKey && ['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault()
      if (event.key === '0') resetZoom()
      else zoom(event.key === '-' ? 2 : 0.5)
    } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      setActive(current => event.key === 'Home' ? 0 : event.key === 'End' ? last
        : Math.max(0, Math.min(last, (current ?? last) + (event.key === 'ArrowLeft' ? -1 : 1))))
    }
    if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false
  }

  const viewportFormat = new Intl.DateTimeFormat('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    ...(model && model.window.end - model.window.start < 86400 ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  })
  const viewportLabel = model ? [model.window.start, model.window.end].map(date => viewportFormat.format(new Date(date * 1000))).join(' – ') : ''
  const description = points.length
    ? `${label} personal-best progression, ${model?.zoomed ? `showing ${viewportLabel}` : 'all time'}. ${points.length} all-time ${points.length === 1 ? 'improvement' : 'improvements'} since ${formatCubingDate(points[0].timestamp)}. Best in view ${formatCubingTime(visiblePB)}. Lower times are better.`
    : `No dated ${label} personal-best history available.`

  return (
    <figure className={styles.progression} aria-labelledby={`${id}-title`}>
      <div className={styles.header}>
        <h4 id={`${id}-title`}>PB progression</h4>
        <div className={styles.metric}>
          <label htmlFor={`${id}-metric`}>Metric</label>
          <select id={`${id}-metric`} value={selected} onChange={event => {
            cancelDrag()
            setMetric(event.target.value as ProgressionMetric)
            setActive(null)
          }}>
            {metrics.map(value => <option key={value} value={value}>
              {histories[value]?.kind === 'custom' ? `Custom ${metricNames[value]}` : metricNames[value]}
            </option>)}
          </select>
        </div>
      </div>
      {model && <div className={styles.toolbar}>
        <div className={styles.summary}>
          <span className={styles.best}>{model?.zoomed ? 'PB in view:' : 'PB:'} <b>{formatCubingTime(visiblePB)}</b></span>
        </div>
        {model && <div className={styles.zoom} role="group" aria-label="Chart zoom">
          <button type="button" aria-label="Zoom out on time axis" title="Zoom out" disabled={!model.zoomed} onClick={() => zoom(2)}>−</button>
          <button type="button" aria-label="Zoom in on time axis" title="Zoom in" disabled={model.window.end - model.window.start <= model.minimumSpan} onClick={() => zoom(0.5)}>+</button>
          <button type="button" disabled={!model.zoomed} onClick={resetZoom}>Reset zoom</button>
        </div>}
      </div>}
      {model ? (
        <div className={styles.plot} ref={plotRef} data-view-start={model.window.start} data-view-end={model.window.end}>
          <svg className={styles.chart} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} role="img" aria-label={description}>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {model.yTicks.map((tick, index) => (
              <g key={index} aria-hidden="true">
                <line className={styles.grid} x1={model.left} x2={model.endX} y1={tick.y} y2={tick.y} />
                <text className={styles.axis} x={model.left - 7} y={tick.y + 3} textAnchor="end">{tick.label}s</text>
              </g>
            ))}
            <path d={model.fill} fill={`url(#${id}-fill)`} />
            <path className={styles.line} d={model.line} fill="none" />
            {model.coordinates.filter(coordinate => !coordinate.carried).map((coordinate, index) => (
              <circle className={styles.point} key={index} cx={coordinate.x} cy={coordinate.y} r="2.5" />
            ))}
            {activeCoordinate && (
              <g aria-hidden="true">
                <line className={styles.guide} x1={activeCoordinate.x} x2={activeCoordinate.x} y1="16" y2={model.bottom} />
                <circle className={styles.activePoint} cx={activeCoordinate.x} cy={activeCoordinate.y} r="4" />
              </g>
            )}
            {brush && !brush.pan && <rect className={styles.brush}
              x={Math.max(model.left, Math.min(brush.start, brush.end))} y="16"
              width={Math.max(0, Math.min(model.endX, Math.max(brush.start, brush.end)) - Math.max(model.left, Math.min(brush.start, brush.end)))}
              height={model.bottom - 16} aria-hidden="true" />}
            {model.xTicks.map((tick, index) => (
              <text className={styles.axis} key={index} x={tick.x} y={CHART_HEIGHT - 8}
                textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'} aria-hidden="true">{tick.label}</text>
            ))}
          </svg>
          <button className={styles.inspector} ref={inspectorRef} type="button" aria-label={`Inspect ${label} progression`}
            aria-describedby={`${id}-selection`} aria-keyshortcuts="ArrowLeft ArrowRight Home End Shift+ArrowLeft Shift+ArrowRight"
            data-dragging={brush?.pan ? 'pan' : brush ? 'zoom' : undefined}
            onPointerMove={movePointer} onPointerDown={startDrag} onPointerUp={finishDrag}
            onPointerCancel={cancelDrag} onLostPointerCapture={() => { if (drag.current) cancelDrag() }}
            onPointerLeave={event => { if (event.pointerType === 'mouse' && !focused && !drag.current) setActive(null) }}
            onFocus={() => { setFocused(true); setActive(current => current ?? model.coordinates.length - 1) }}
            onBlur={() => { setFocused(false); setActive(null) }} onKeyDown={navigate}
            onClick={() => {
              if (suppressClick.current) { suppressClick.current = false; return }
              setActive(current => current ?? model.coordinates.length - 1)
            }} />
          {selectedPoint && (
            <div className={styles.tooltip} aria-hidden="true">
              <b>{formatCubingTime(selectedPoint)}</b>
              <span>{recordDescription(selectedPoint)}</span>
            </div>
          )}
        </div>
      ) : <p className={styles.empty}>No dated {label.toLowerCase()} results available yet.</p>}
      {model?.zoomed && <span className={styles.viewport}>{viewportLabel}</span>}
      <p className={styles.visuallyHidden} id={`${id}-selection`} aria-live="polite" aria-atomic="true">
        {selectedPoint ? `${label} PB ${formatCubingTime(selectedPoint)}. ${recordDescription(selectedPoint)}`
          : `${description} Drag horizontally to zoom into dates. Shift-drag or Shift-arrow keys pan. Control or Command plus scroll zooms at the cursor. Plus and minus zoom, zero resets. Left and right arrow keys inspect records; Home and End select the first and last.`}
      </p>
      {(history?.undatedCount ?? 0) > 0 && <span className={styles.datedOnly}>Dated results only</span>}
    </figure>
  )
}
