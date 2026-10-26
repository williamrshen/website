import type { GardenHost } from './index.ts'
import { addOverlay, labeller } from './overlay.ts'
import { currentWarnings } from './warnings.ts'

/**
 * `?garden=debug`: island outlines, object anchors and orientation, and the world axes, so
 * config coordinates are easy to read off the screen.
 */
export function debugOverlay({ scene }: GardenHost) {
  return addOverlay(scene, (ctx) => {
    const world = scene.built, unit = scene.tileSize, label = labeller(ctx)
    ctx.lineWidth = 1.5

    // Islands: their radius traced on the ground.
    for (const island of world.islands) {
      ctx.beginPath()
      for (let i = 0; i <= 48; i++) {
        const angle = (i / 48) * Math.PI * 2
        const point = scene.project(island.x + Math.cos(angle) * island.radius, island.y + Math.sin(angle) * island.radius)
        if (i) ctx.lineTo(point.x, point.y)
        else ctx.moveTo(point.x, point.y)
      }
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = 'rgba(40, 110, 160, 0.85)'
      ctx.stroke()
      ctx.setLineDash([])
      const center = scene.project(island.x, island.y)
      label(`${island.id} (${island.x}, ${island.y}) r${island.radius}`, center.x + 6, center.y + unit * 0.9, '#1d4f73')
    }

    // World axes from the origin, one tile per tick.
    const origin = scene.project(0, 0)
    for (const [axis, color] of [['x', '#c0392b'], ['y', '#2563eb']] as const) {
      const tip = scene.project(axis === 'x' ? 2 : 0, axis === 'y' ? 2 : 0)
      ctx.strokeStyle = ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(origin.x, origin.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.stroke()
      label(`+${axis}`, tip.x + 4, tip.y + 4, color)
    }

    // Objects: anchor, id, and which way local +x points after rotate/mirror. Warned ones in red.
    const warned = new Set(currentWarnings().map((warning) => warning.object))
    for (const object of world.objects) {
      const at = scene.project(object.x, object.y)
      const turn = (object.rotate / 90) % 4
      const direction = object.mirror ? [[0, 1], [-1, 0], [0, -1], [1, 0]][turn] : [[1, 0], [0, 1], [-1, 0], [0, -1]][turn]
      const tip = scene.project(object.x + direction[0] * 0.8, object.y + direction[1] * 0.8)
      ctx.strokeStyle = '#b45309'
      ctx.beginPath()
      ctx.moveTo(at.x, at.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.stroke()
      ctx.fillStyle = '#b45309'
      ctx.beginPath()
      ctx.arc(at.x, at.y, 3, 0, Math.PI * 2)
      ctx.fill()
      const flags = [object.rotate ? `↻${object.rotate}` : '', object.mirror ? 'mirrored' : ''].filter(Boolean).join(' ')
      const warning = warned.has(object.id)
      label(`${warning ? '⚠ ' : ''}${object.id}${flags ? ` ${flags}` : ''}`, at.x + 6, at.y - 6, warning ? '#dc2626' : '#7c2d12')
    }

    // Links: the area that highlights for each destination, and where it goes.
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = '#7c3aed'
    for (const link of scene.activeLinks) {
      const shape = scene.linkOutline(link.id)
      if (!shape) continue
      ctx.beginPath()
      shape.outline.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y))
      ctx.closePath()
      ctx.stroke()
      label(`link ${link.id} → ${link.href}`, shape.bounds.left, shape.bounds.top - 4, '#5b21b6')
    }
    ctx.setLineDash([])

    const boxes = world.geometry.length
    const warnings = currentWarnings().length
    label(`garden debug · ${world.objects.length} objects · ${boxes} shapes · ${world.islands.length} islands · ${warnings ? `⚠ ${warnings} warnings (see console)` : 'no warnings'}`, 12, ctx.canvas.clientHeight - 14, warnings ? '#dc2626' : undefined)
  })
}
