// Small deterministic PRNG helpers (dependency-free)
// mulberry32 implementation with string seeding

function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string | number) {
  const seedNum = typeof seed === 'number' ? (seed >>> 0) : hashStringToSeed(String(seed));
  let a = seedNum >>> 0;
  return function rng() {
    // mulberry32-like
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
