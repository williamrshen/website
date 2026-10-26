/** A named color used by garden objects. Resolved against the active palette at render time. */
export type ColorName =
  | 'trunk' | 'trunkBase' | 'branch'
  | 'pineTrunk'
  | 'stem' | 'plantLeaf' | 'plantLeafDark'
  | 'rock' | 'rockTop'
  | 'benchLeg' | 'benchSeat' | 'benchBack'
  | 'grass' | 'grassLight' | 'grassTuft'
  | 'water' | 'creekBank' | 'bridgeDeck' | 'bridgeRail'

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
  /** Fireflies, and the color of snowflakes when `live` is `snow`. */
  firefly: { color: string; size: number; glow?: { blur: number; color: string } }
  /** Glow that follows the pointer, from center to edge. */
  pointerGlow: { center: string; edge: string }
  /** Keyboard focus ring drawn around a linked object; the halo keeps it visible on any color. */
  focusRing: { color: string; halo: string }
  /** Blends the tops of boxes (and the upper faces of pines) toward `color`; `cover` is 0–1. */
  snow?: { color: string; cover: number }
  /** What moves over the garden: drifting fireflies (default), falling leaves, snow, or blooming flowers. */
  live?: LiveEffect
}

export type LiveEffect = 'fireflies' | 'leaves' | 'snow' | 'blooms'

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
/** A leaf falling from a canopy; it respawns somewhere else under the same tree each cycle. */
export type Leaf = { source: Point & { radius: number; height: number }; seed: number; period: number; phase: number; spin: number; shade: number }
export type Flake = Point & { z: number; seed: number; period: number; phase: number; size: number }
/** A flower that sprouts, blooms, and fades on a grass tile, then springs up on another one. */
export type Bloom = { seed: number; period: number; phase: number; scale: number }

type Area = { x: number; y: number; z: number; width: number; depth: number; height: number }

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
  /**
   * A stream flowing along local x, `length` long and up to `width` wide, tapering at both ends.
   * It wiggles `meander` to each side and is lined with a few pebbles.
   */
  creek: { length: number; width: number; meander?: number; pebbles?: number }
  /** An arched footbridge spanning `length` along local x, with handrails and stone footings. */
  bridge: { length?: number; width?: number; rise?: number }
  /** Scatters plants around islands. */
  scatter: {
    count: number
    /** Every nth plant gets a flower. */
    flowerEvery: number
    /** Keeps plants out of a circle this wide around the scatter's own position. */
    clearRadius: number
    /**
     * Plants landing within this distance of another object's footprint (water, rocks, footings…)
     * are skipped. Skipping still uses up the plant's random draws, so the others stay put.
     * Defaults to 0.12; a negative value turns it off.
     */
    keepOut?: number
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
  /** Id of an entry in the config's `links`; hovering highlights the object and clicking follows it. */
  link?: string
} & Orientation

/**
 * Turns and flips an object around its position. `mirror` flips it left↔right on screen, then
 * `rotate` turns it clockwise (as seen on screen) in quarter turns, since boxes stay axis-aligned.
 */
export type Orientation = { rotate?: 0 | 90 | 180 | 270; mirror?: boolean }
export type GardenObject = { [K in ObjectType]: Placement & { type: K } & ObjectParams[K] }[ObjectType]

/** Where a linked object goes. `label` names it on hover and for screen readers. */
export type GardenLink = { label: string; href: string }

export type GardenConfig = {
  /** Destinations objects can link to, in the order keyboard users reach them. */
  links?: Record<string, GardenLink>
  /** Ground tiles span -extent…extent on both axes; `seed` varies grass shades and tufts. */
  ground: { extent: number; seed: number }
  islands: Island[]
  /** Drawn in depth order; ties keep list order. */
  objects: GardenObject[]
  /** Drifting pollen/fireflies within a world-space box. */
  fireflies: { count: number; seed: number; area: Area }
  /** Leaves falling from every oak (palettes with `live: 'leaves'`). */
  leaves?: { count: number; seed: number }
  /** Snowfall within a world-space box (palettes with `live: 'snow'`). */
  snow?: { count: number; seed: number; area: Area }
  /** Flowers springing up on open grass (palettes with `live: 'blooms'`). */
  blooms?: { count: number; seed: number }
}

/** Where an object ended up in world space, for tooling. */
export type PlacedObject = Point & { id: string; type: ObjectType; island?: string; rotate: number; mirror: boolean; link?: string }

/** Everything the renderer needs, built once from a config. */
export type World = {
  tiles: Tile[]; geometry: Geometry[]; fireflies: Firefly[]; islands: Island[]; objects: PlacedObject[]
  links: Record<string, GardenLink>
  leaves: Leaf[]; flakes: Flake[]; blooms: Bloom[]
  /** Grass tiles a bloom can grow on: well inside an island and not hidden behind an object. */
  bloomSpots: Point[]
}
