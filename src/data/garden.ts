import type { Palette } from '../garden/types.ts'

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
