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
    return `{ ${entries.map(([key, item]) => `${quoteKey(key)}: ${literal(item)}`).join(', ')} }`
  }
  return 'undefined'
}

const quoteKey = (name: string) => identifier.test(name) ? name : literal(name)
const list = (items: unknown[], indent: string) => `[\n${items.map((item) => `${indent}  ${literal(item)},`).join('\n')}\n${indent}]`

/**
 * The bed, with its plants written as `projectPlants` (generated from the project data in
 * `src/data/garden.ts`) rather than copied in, so pasting keeps them in sync with the projects.
 */
function bed({ plants: _plants, spots, ...rest }: NonNullable<GardenConfig['bed']>) {
  return `  bed: {\n    ${Object.entries(rest).map(([key, value]) => `${key}: ${literal(value)}`).join(', ')}, plants: projectPlants,\n    spots: ${literal(spots)},\n  },`
}

/** The `garden` export of `src/data/garden.ts`, one island or object per line. */
export function serializeGarden(config: GardenConfig) {
  return [
    'export const garden: GardenConfig = {',
    ...(config.links ? ['  links: {', ...Object.entries(config.links).map(([id, link]) => `    ${quoteKey(id)}: ${literal(link)},`), '  },'] : []),
    ...(config.bed ? [bed(config.bed)] : []),
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
