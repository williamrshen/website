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
  /** `pine` lists the four faces of each pine layer: back-left, back-right, front-right, front-left. */
  swatches: Record<SwatchName, string[]>
  /** Grid lines and tile tint. RGB values are `"r,g,b"`; alphas scale with the fade and pointer light. */
  ground: { fill: string; fillGrid: number; fillLight: number; stroke: string; strokeAlpha: number }
  /** Soft shadow under each island, from center to edge. */
  shadow: { center: string; edge: string }
  firefly: { color: string; size: number; glow?: { blur: number; color: string } }
  /** Glow that follows the pointer, from center to edge. */
  pointerGlow: { center: string; edge: string }
}
