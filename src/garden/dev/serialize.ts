import type { GardenConfig, Palette } from '../types.ts'

const identifier = /^[A-Za-z_$][\w$]*$/

/** A compact TypeScript literal: single-quoted strings, unquoted keys, objects on one line. */
export function literal(value: unknown): string {
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'boolean' || value === null) return String(value)
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined)
    if (!entries.length) return '{}'
    return `{ ${entries.map(([key, item]) => `${identifier.test(key) ? key : literal(key)}: ${literal(item)}`).join(', ')} }`
  }
  return 'undefined'
}

const list = (items: unknown[], indent: string) => `[\n${items.map((item) => `${indent}  ${literal(item)},`).join('\n')}\n${indent}]`

/** The `garden` export of `src/data/garden.ts`, one island or object per line. */
export function serializeGarden(config: GardenConfig) {
  return [
    'export const garden: GardenConfig = {',
    `  ground: ${literal(config.ground)},`,
    `  islands: ${list(config.islands, '  ')},`,
    `  objects: ${list(config.objects, '  ')},`,
    `  fireflies: ${literal(config.fireflies)},`,
    ...(['leaves', 'snow', 'blooms'] as const).filter((key) => config[key]).map((key) => `  ${key}: ${literal(config[key])},`),
    '}',
  ].join('\n')
}

/** One palette as a TypeScript object literal, e.g. to paste over `daylight` in the data file. */
export function serializePalette(name: string, palette: Palette) {
  const lines = Object.entries(palette).map(([key, value]) => {
    if (key === 'colors' || key === 'swatches') {
      const inner = Object.entries(value as Record<string, unknown>).map(([k, v]) => `    ${k}: ${literal(v)},`).join('\n')
      return `  ${key}: {\n${inner}\n  },`
    }
    return `  ${key}: ${literal(value)},`
  })
  return `const ${name}: Palette = {\n${lines.join('\n')}\n}`
}

/** Rounds to two decimals, which is plenty for positions and scales. */
export const round = (value: number) => Math.round(value * 100) / 100
