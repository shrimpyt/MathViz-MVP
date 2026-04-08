// math-utils.ts
// Canonical PRNG and random-selection helpers.
// Every file that needs seeded randomness imports from HERE — no copies.

/** A seeded random-number generator: () => number in [0, 1). */
export type RNG = () => number;

/**
 * Mulberry32 — a fast, high-quality 32-bit seeded PRNG.
 * Returns an RNG function that yields values in [0, 1).
 */
export function mulberry32(seed: number): RNG {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max] (inclusive). */
export function randInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Pick a random element from a non-empty array. */
export function pick<T>(rng: RNG, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
