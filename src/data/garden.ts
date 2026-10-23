import type { GardenConfig, Palette } from '../garden/types.ts'

/**
 * The garden layout. Units are ground tiles; +x runs toward the lower right of the screen and +y
 * toward the lower left, so screen-right is +x/-y and the front of the scene is +x/+y.
 * Objects placed on an island move with it. Seeds reproduce the original hand-tuned garden;
 * change one to reroll just that object, or omit it to derive a seed from the object's id.
 */
export const garden: GardenConfig = {
  ground: { extent: 45, seed: 51 },
  islands: [
    { id: 'main', x: 0, y: 0, radius: 5.1 },
    { id: 'right', x: 5.9, y: -2.1, radius: 2.5 },
    { id: 'left', x: -4.9, y: 2.9, radius: 2.2 },
    { id: 'front', x: 3.3, y: 5.4, radius: 2.1 },
    { id: 'back', x: -5.2, y: -3.5, radius: 1.6 },
  ],
  objects: [
    { id: 'oak', type: 'oak', island: 'main', seed: 2198020462 },
    { id: 'tall-pine', type: 'pine', island: 'right', scale: 0.86 },
    { id: 'short-pine', type: 'pine', island: 'right', x: 1.1, y: 0.7, scale: 0.49 },
    { id: 'left-pine', type: 'pine', island: 'left', scale: 0.66 },
    { id: 'sapling', type: 'oak', island: 'front', x: 0.3, scale: 0.24, seed: 1581092675 },
    // Plants scatter around every island but stay clear of the big oak's trunk.
    { id: 'plants', type: 'scatter', count: 44, flowerEvery: 3, clearRadius: 1.1, seed: 3263619596 },
    { id: 'bench-rock', type: 'rock', island: 'main', x: -2, y: 1.7, scale: 0.46 },
    { id: 'bench-pebble', type: 'rock', island: 'main', x: -2.3, y: 1.95, scale: 0.27 },
    { id: 'right-rock', type: 'rock', island: 'right', x: -1.5, y: -0.1, scale: 0.4 },
    { id: 'back-rock', type: 'rock', island: 'back', x: 0.2, scale: 0.6 },
    { id: 'back-pebble', type: 'rock', island: 'back', x: 0.75, y: 0.1, scale: 0.32 },
    { id: 'path', type: 'path', island: 'main', x: 1.3, y: 1.5, stones: 5, step: { x: 0.35, y: 0.48 } },
    { id: 'bench', type: 'bench', island: 'main', x: -2, y: 1.95 },
  ],
  fireflies: { count: 18, seed: 664517015, area: { x: -6.5, y: -4, z: 0.4, width: 13, depth: 10, height: 4 } },
}

const daylight: Palette = {
  light: { box: 1, pine: 1 },
  colors: {
    trunk: '#96704b', trunkBase: '#896844', branch: '#9e7951',
    pineTrunk: '#967652',
    stem: '#698250', plantLeaf: '#8eaa66', plantLeafDark: '#779858',
    rock: '#b2b5a1', rockTop: '#c0c2af',
    benchLeg: '#8b7050', benchSeat: '#b69869', benchBack: '#a78c61',
    grass: '#a6ba83', grassLight: '#b3c391', grassTuft: '#c8d3a4',
  },
  swatches: {
    leaves: ['#819b4d', '#8ba352', '#91a957', '#789648', '#9ab15c', '#88a04c'],
    flowers: ['#dfc17a', '#ece2b7'],
    pine: ['#819d6a', '#668650', '#527446', '#72975d'],
    path: ['#d1c8a7', '#c5bf9e'],
  },
  ground: { fill: '148,175,109', fillGrid: 0.06, fillLight: 0.11, stroke: '123,151,87', strokeAlpha: 0.43 },
  shadow: { center: '#4a643630', edge: '#4a643600' },
  firefly: { color: '#a4b576', size: 1.7 },
  pointerGlow: { center: '#dce9aa14', edge: '#dce9aa00' },
}

/** Evening reuses the daylight colors under dimmer light, with glowing fireflies. */
const evening: Palette = {
  ...daylight,
  light: { box: 0.61, pine: 0.64 },
  ground: { fill: '167,204,114', fillGrid: 0.055, fillLight: 0.1, stroke: '195,224,145', strokeAlpha: 0.45 },
  shadow: { center: '#071b2459', edge: '#4a643600' },
  firefly: { color: '#e7efb0', size: 2.3, glow: { blur: 9, color: '#e4f7a6' } },
  pointerGlow: { center: '#dff9a816', edge: '#dce9aa00' },
}

/** Named palettes. The site theme picks `daylight` or `evening`; add more (autumn, snow…) here. */
export const gardenPalettes = { daylight, evening } satisfies Record<string, Palette>
