/** Returns a value in [0, 1). */
export type Random = () => number

/**
 * Seeded linear congruential generator. Each garden object gets its own generator, so adding,
 * removing, or reordering one object never reshuffles the others.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** Stable 32-bit seed for objects without an explicit one (FNV-1a hash of the id). */
export function seedFromId(id: string) {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return hash >>> 0
}
