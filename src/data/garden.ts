import type { Season } from '../garden/seasons.ts'
import type { BedPlant, GardenConfig, Palette } from '../garden/types.ts'
import { projectEntries } from './projectEntries.ts'

/**
 * One plant per project (its `plant` in projectEntries.ts) for the bed by the pines. Hovering names
 * the project and clicking opens it in the projects section. Ids come from the project, so adding
 * one grows one new plant and leaves the others as they were.
 */
export const projectPlants: BedPlant[] = projectEntries.map((project) => ({
  id: `project-${project.id}`, label: project.name, href: `#work/${project.id}`, species: project.plant,
}))

/**
 * The garden layout. Units are ground tiles; +x runs toward the lower right of the screen and +y
 * toward the lower left, so screen-right is +x/-y and the front of the scene is +x/+y.
 * Objects placed on an island move with it. Seeds reproduce the original hand-tuned garden;
 * change one to reroll just that object, or omit it to derive a seed from the object's id.
 */
export const garden: GardenConfig = {
  // Hovering a linked object highlights it; clicking (or tapping twice) goes to the section.
  links: {
    about: { label: 'about me', href: '#about' },
    experience: { label: 'work experience', href: '#experience' },
    projects: { label: 'projects', href: '#work' },
    hobbies: { label: 'hobbies', href: '#hobbies' },
  },
  // The project bed in front of the pines, in a staggered row; projects fill the spots left to right.
  bed: {
    island: 'bed', section: 'projects', scale: 1.4, plants: projectPlants,
    spots: [{ x: -1.3, y: 1.2 }, { x: -0.55, y: 0.75 }, { x: 0, y: 0 }, { x: 0.75, y: -0.55 }, { x: 1.2, y: -1.3 }],
  },
  ground: { extent: 45, seed: 51 },
  islands: [
    { id: 'main', x: 0, y: 0, radius: 5.1 },
    { id: 'right', x: 5.9, y: -2.1, radius: 2.5 },
    { id: 'left', x: -4.9, y: 2.9, radius: 2.2 },
    { id: 'front', x: 3.35, y: 5.2, radius: 2.4 },
    // Grass under the creek's ends, so the water doesn't run out over bare grid.
    { id: 'creek-left', x: 1.1, y: 5.1, radius: 1.6, plants: false },
    { id: 'creek-right', x: 5.6, y: 4.8, radius: 1.5, plants: false },
    // Grass for the project bed, just in front of the right island.
    { id: 'bed', x: 7.9, y: 0.1, radius: 2.8, plants: false },
    { id: 'back', x: -5.2, y: -3.5, radius: 1.6 },
  ],
  objects: [
    { id: 'oak', type: 'oak', island: 'main', seed: 2198020462, link: 'about' },
    { id: 'tall-pine', type: 'pine', island: 'right', scale: 0.86, link: 'projects' },
    { id: 'short-pine', type: 'pine', island: 'right', x: 1.1, y: 0.7, scale: 0.49, link: 'projects' },
    { id: 'left-pine', type: 'pine', island: 'left', scale: 0.66, link: 'experience' },
    // Plants scatter around every island but stay clear of the big oak's trunk.
    { id: 'plants', type: 'scatter', count: 44, flowerEvery: 3, clearRadius: 1.1, seed: 3263619596 },
    { id: 'bench-rock', type: 'rock', island: 'main', x: -2, y: 1.7, scale: 0.46 },
    { id: 'bench-pebble', type: 'rock', island: 'main', x: -2.3, y: 1.95, scale: 0.27 },
    { id: 'right-rock', type: 'rock', island: 'right', x: -1.5, y: -0.1, scale: 0.4 },
    { id: 'back-rock', type: 'rock', island: 'back', x: 0.2, scale: 0.6 },
    { id: 'back-pebble', type: 'rock', island: 'back', x: 0.75, y: 0.1, scale: 0.32 },
    { id: 'path', type: 'path', island: 'main', x: 1.3, y: 1.5, stones: 5, step: { x: 0.35, y: 0.48 } },
    { id: 'bench', type: 'bench', island: 'main', x: -2, y: 1.95 },
    // A little creek across the front island, with the path's footbridge over it.
    { id: 'creek', type: 'creek', island: 'front', length: 5.6, width: 0.75, link: 'hobbies' },
    { id: 'bridge', type: 'bridge', island: 'front', rotate: 90, length: 1.9, link: 'hobbies' },
  ],
  fireflies: { count: 18, seed: 664517015, area: { x: -6.5, y: -4, z: 0.4, width: 13, depth: 10, height: 4 } },
  // Seasonal effects; a palette's `live` picks which one runs.
  leaves: { count: 34, seed: 9071 },
  snow: { count: 150, seed: 4412, area: { x: -9, y: -8, z: 1, width: 18, depth: 17, height: 11 } },
  blooms: { count: 14, seed: 3108 },
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
    water: '#8fbcc4', creekBank: '#8ea36f', bridgeDeck: '#b8956a', bridgeRail: '#8d7051',
    sunflowerPetal: '#e2b443', sunflowerCenter: '#7b5534', tulip: '#cf5a4c', lavender: '#9886c2',
    snowball: '#f0eee2', mushroomCap: '#c45a43', mushroomStem: '#ebe2cb',
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
  focusRing: { color: '#283d32', halo: '#f3f2e9' },
}

/**
 * An evening version of a daylight palette: the same colors and seasonal effect under dimmer light,
 * a darker shadow, and glowing fireflies (in summer). `overrides` replaces anything else, e.g. a
 * season's grid tint.
 */
const atEvening = (palette: Palette, overrides: Partial<Palette> = {}): Palette => ({
  ...palette,
  light: { box: 0.61, pine: 0.64 },
  ground: { fill: '167,204,114', fillGrid: 0.055, fillLight: 0.1, stroke: '195,224,145', strokeAlpha: 0.45 },
  shadow: { center: '#071b2459', edge: '#4a643600' },
  firefly: { color: '#e7efb0', size: 2.3, glow: { blur: 9, color: '#e4f7a6' } },
  pointerGlow: { center: '#dff9a816', edge: '#dce9aa00' },
  focusRing: { color: '#e1e9cf', halo: '#192a29' },
  ...overrides,
})

/** Summer is the original garden. */
const evening = atEvening(daylight)

/** Autumn: amber canopy, drier grass, warmer grid, and leaves falling from the oaks. */
const autumn: Palette = {
  ...daylight,
  colors: {
    ...daylight.colors,
    stem: '#7a7448', plantLeaf: '#a9a04f', plantLeafDark: '#8f8a45',
    grass: '#b2b07a', grassLight: '#c0bd87', grassTuft: '#d0c796',
    creekBank: '#9e9765',
  },
  swatches: {
    leaves: ['#c8742f', '#d18a3a', '#b85c2c', '#d9a441', '#a8502a', '#c98b2e'],
    flowers: ['#c96a3a', '#e0b45a'],
    pine: ['#7f9466', '#63804f', '#4f6e45', '#6f8d5a'],
    path: daylight.swatches.path,
  },
  ground: { ...daylight.ground, fill: '170,155,100', stroke: '150,132,82' },
  shadow: { center: '#5a4a3030', edge: '#5a4a3000' },
  firefly: { color: '#c9a35e', size: 1.7 },
  live: 'leaves',
}
const autumnEvening = atEvening(autumn, { ground: { fill: '204,180,114', fillGrid: 0.055, fillLight: 0.1, stroke: '224,196,145', strokeAlpha: 0.45 } })

/** Winter: frosted canopy and grass with snow on every top face, cool grid, and snowfall. */
const winter: Palette = {
  ...daylight,
  colors: {
    ...daylight.colors,
    stem: '#7c7f6c', plantLeaf: '#9aa48f', plantLeafDark: '#868f7b',
    rock: '#b9bcb3', rockTop: '#c9ccc4',
    grass: '#c3cbc0', grassLight: '#d0d6cd', grassTuft: '#e3e7e1',
    // Frozen over.
    water: '#c4d9e3', creekBank: '#aab4ad',
  },
  swatches: {
    leaves: ['#8f9a80', '#98a389', '#a3ad94', '#879377', '#b3bba6', '#929d84'],
    flowers: ['#e9eef2', '#d7dee6'],
    pine: ['#6f8a6a', '#55704f', '#435d40', '#61795a'],
    path: ['#e0dccd', '#d6d1bf'],
  },
  ground: { ...daylight.ground, fill: '150,165,175', stroke: '118,134,150' },
  shadow: { center: '#46566430', edge: '#46566400' },
  // Snowflakes: blue-grey so they show against the pale page.
  firefly: { color: '#b4c3d3', size: 1.7 },
  snow: { color: '#f4f7fa', cover: 0.82 },
  live: 'snow',
}
const winterEvening = atEvening(winter, {
  ground: { fill: '160,185,210', fillGrid: 0.055, fillLight: 0.1, stroke: '190,210,232', strokeAlpha: 0.45 },
  shadow: { center: '#06142459', edge: '#06142400' },
  firefly: { color: '#e4ecf5', size: 1.7 },
})

/** Spring: fresh greens with blossom in the canopy, and flowers springing up on the grass. */
const spring: Palette = {
  ...daylight,
  colors: {
    ...daylight.colors,
    plantLeaf: '#9cc06a', plantLeafDark: '#7fa652',
    grass: '#a9c47f', grassLight: '#b8d08e', grassTuft: '#d4e2a8',
    water: '#89c2cc', creekBank: '#8aaa66',
  },
  swatches: {
    leaves: ['#9cbf5a', '#a8c862', '#f2b8c6', '#94b753', '#e8a5b8', '#a3c45e'],
    flowers: ['#f2b8c6', '#fff3b0'],
    pine: ['#86a86c', '#6a8d52', '#567a48', '#79a05f'],
    path: daylight.swatches.path,
  },
  firefly: { color: '#f2c6d2', size: 1.7 },
  live: 'blooms',
}
const springEvening = atEvening(spring)

/** Named palettes. Edit colors here; `gardenSeasons` decides which ones the site uses when. */
export const gardenPalettes = {
  daylight, evening, autumn, autumnEvening, winter, winterEvening, spring, springEvening,
} satisfies Record<string, Palette>

export type GardenPaletteName = keyof typeof gardenPalettes

/** Which palettes each season uses by day and in the evening theme. */
export const gardenSeasons: Record<Season, { daylight: GardenPaletteName; evening: GardenPaletteName }> = {
  spring: { daylight: 'spring', evening: 'springEvening' },
  summer: { daylight: 'daylight', evening: 'evening' },
  autumn: { daylight: 'autumn', evening: 'autumnEvening' },
  winter: { daylight: 'winter', evening: 'winterEvening' },
}
