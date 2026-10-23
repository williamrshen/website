/** A named color used by garden objects. Resolved against the active palette at render time. */
export type ColorName =
  | 'trunk' | 'trunkBase' | 'branch'
  | 'pineTrunk'
  | 'stem' | 'plantLeaf' | 'plantLeafDark'
  | 'rock' | 'rockTop'
  | 'benchLeg' | 'benchSeat' | 'benchBack'
  | 'grass' | 'grassLight' | 'grassTuft'

/** A list of related colors; objects pick one by index (wrapping if a palette has fewer entries). */
export type SwatchName = 'leaves' | 'flowers' | 'pine' | 'path'

/** Either a single named color or an entry in a swatch. */
export type Paint = ColorName | { swatch: SwatchName; index: number }

export type Palette = {
  /**
   * Brightness multipliers applied on top of every color. Shading is per face, so lowering these
   * darkens the whole scene evenly; set 1 to use colors exactly as written.
   */
  light: { box: number; pine: number }
  colors: Record<ColorName, string>
  /** `pine` lists the four faces of each pine tier on screen: upper right, front right, front left, upper left. */
  swatches: Record<SwatchName, string[]>
  /** Grid lines and tile tint. RGB values are `"r,g,b"`; alphas scale with the fade and pointer light. */
  ground: { fill: string; fillGrid: number; fillLight: number; stroke: string; strokeAlpha: number }
  /** Soft shadow under each island, from center to edge. */
  shadow: { center: string; edge: string }
  firefly: { color: string; size: number; glow?: { blur: number; color: string } }
  /** Glow that follows the pointer, from center to edge. */
  pointerGlow: { center: string; edge: string }
  /** Blends the tops of boxes (and the upper faces of pines) toward `color`; `cover` is 0–1. */
  snow?: { color: string; cover: number }
}

export type Point = { x: number; y: number }
/** Which of a box's three camera-facing sides to draw: +z (top), +y (left), +x (right). */
export type Faces = { top: boolean; left: boolean; right: boolean }

/** World-space geometry produced by object builders, drawn back to front by `order`. */
export type Box = {
  kind: 'box'
  /** Id of the object that produced it. */
  owner: string
  x: number; y: number; z: number
  width: number; depth: number; height: number
  paint: Paint
  faces: Faces
  order: number
}
/** One tier of a pine: a square-based pyramid centered at (x, y). */
export type PineLayer = {
  kind: 'pine'
  /** Id of the object that produced it. */
  owner: string
  x: number; y: number; z: number
  radius: number
  /** Height of the tip above the base. */
  height: number
  /** Offset of the tip from the center, so tiers lean slightly toward the back. */
  tip: Point
  order: number
}
export type Geometry = Box | PineLayer

export type Tile = Point & { fade: number; gridFade: number; variation: number; grass: boolean }
export type Firefly = Point & { z: number; phase: number }

/** A patch of grass. Islands shape the ground, cast a soft shadow, and anchor objects. */
export type Island = Point & { id: string; radius: number }

/** Parameters for each object type, keyed by `type`. Add a type here and in `objectTypes`. */
export type ObjectParams = {
  /** Voxel oak with a trunk, branches, and a three-lobed canopy. */
  oak: { scale?: number }
  /** Four stacked pyramids on a thin trunk. */
  pine: { scale: number }
  /** A small leafy stem, optionally with a flower. */
  plant: { scale?: number; flower?: boolean }
  /** A boulder with a lighter cap. */
  rock: { scale: number }
  /** Stepping stones laid diagonally, `step` apart. */
  path: { stones: number; step: Point }
  /** A slatted bench facing the camera. */
  bench: Record<never, never>
  /** Scatters plants around islands. */
  scatter: {
    count: number
    /** Every nth plant gets a flower. */
    flowerEvery: number
    /** Keeps plants out of a circle this wide around the scatter's own position. */
    clearRadius: number
  }
}
export type ObjectType = keyof ObjectParams

type Placement = {
  /** Unique name. Also seeds the object's random generator when `seed` is omitted. */
  id: string
  /** Position relative to this island's center; otherwise relative to the world origin. */
  island?: string
  x?: number
  y?: number
  /** Seed for this object's random generator (any 32-bit number). */
  seed?: number
} & Orientation

/**
 * Turns and flips an object around its position. `mirror` flips it left↔right on screen, then
 * `rotate` turns it clockwise (as seen on screen) in quarter turns, since boxes stay axis-aligned.
 */
export type Orientation = { rotate?: 0 | 90 | 180 | 270; mirror?: boolean }
export type GardenObject = { [K in ObjectType]: Placement & { type: K } & ObjectParams[K] }[ObjectType]

export type GardenConfig = {
  /** Ground tiles span -extent…extent on both axes; `seed` varies grass shades and tufts. */
  ground: { extent: number; seed: number }
  islands: Island[]
  /** Drawn in depth order; ties keep list order. */
  objects: GardenObject[]
  /** Drifting pollen/fireflies within a world-space box. */
  fireflies: { count: number; seed: number; area: { x: number; y: number; z: number; width: number; depth: number; height: number } }
}

/** Where an object ended up in world space, for tooling. */
export type PlacedObject = Point & { id: string; type: ObjectType; island?: string; rotate: number; mirror: boolean }

/** Everything the renderer needs, built once from a config. */
export type World = { tiles: Tile[]; geometry: Geometry[]; fireflies: Firefly[]; islands: Island[]; objects: PlacedObject[] }
