import { describe, it, expect } from 'vitest';
import { generateFloor } from '../src/game/generator';

function positionsKey(e: { pos: { x: number; y: number } }) {
  return `${e.pos.x},${e.pos.y}`;
}

describe('floor generation: entity identity', () => {
  it('generates entity ids that are unique per-floor seed', () => {
    const a = generateFloor('seed-a', { width: 5, height: 5, enemyBudget: 3, chestBudget: 3, wallDensity: 0 });
    const b = generateFloor('seed-b', { width: 5, height: 5, enemyBudget: 3, chestBudget: 3, wallDensity: 0 });

    const idsA = new Set(a.entities.map((e) => e.id));
    const idsB = new Set(b.entities.map((e) => e.id));

    const intersection = [...idsA].filter((id) => idsB.has(id));
    expect(intersection).toEqual([]);

    // sanity: still no overlaps inside a floor
    const occ = new Set<string>();
    for (const e of a.entities) {
      const k = positionsKey(e);
      expect(occ.has(k)).toBe(false);
      occ.add(k);
    }
  });
});
