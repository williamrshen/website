/** Screen-space outlines of garden shapes: picking in the editor, occlusion for live effects. */
import type { Geometry, Point, World } from './types.ts'

export type Project = (x: number, y: number, z?: number) => Point

/** Convex hull (monotone chain), counter-clockwise in screen space. */
export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (sorted.length < 3) return sorted
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (input: Point[]) => {
    const out: Point[] = []
    for (const point of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], point) <= 0) out.pop()
      out.push(point)
    }
    out.pop()
    return out
  }
  return [...half(sorted), ...half(sorted.reverse())]
}

export function insidePolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** The on-screen outline of one shape. */
export function silhouette(item: Geometry, project: Project): Point[] {
  if (item.kind === 'pine') {
    const { x, y, z, radius: r } = item
    return convexHull([
      project(x - r, y - r, z), project(x + r, y - r, z), project(x + r, y + r, z), project(x - r, y + r, z),
      project(x + item.tip.x, y + item.tip.y, z + item.height),
    ])
  }
  const { x, y, z, width: w, depth: d, height: h } = item
  const corners: Point[] = []
  for (const cx of [x, x + w]) for (const cy of [y, y + d]) for (const cz of [z, z + h]) corners.push(project(cx, cy, cz))
  return convexHull(corners)
}

/** Id of the frontmost object drawn under a screen point, if any. */
export function pickObject(world: World, project: Project, point: Point): string | undefined {
  for (let i = world.geometry.length - 1; i >= 0; i--) {
    if (insidePolygon(point, silhouette(world.geometry[i], project))) return world.geometry[i].owner
  }
}

/** Outline around everything an object drew, for highlighting it. */
export function objectOutline(world: World, project: Project, id: string): Point[] {
  return convexHull(world.geometry.filter((item) => item.owner === id).flatMap((item) => silhouette(item, project)))
}
