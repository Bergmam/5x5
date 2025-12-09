import { describe, it, expect } from 'vitest';
import { createRng } from '../src/game/rng';
import { generateFloor } from '../src/game/generator';
import { validateFloor } from '../src/game/validate';

describe('RNG determinism', () => {
  it('produces same sequence for same seed', () => {
    const a = createRng('seed-123');
    const b = createRng('seed-123');
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
});

describe('Generator basic', () => {
  it('generates deterministic floor for a given seed', () => {
    const f1 = generateFloor('seed-xyz');
    const f2 = generateFloor('seed-xyz');
    // Exclude timestamp from comparison since it varies
    const { generatedAt: _t1, ...floor1 } = f1;
    const { generatedAt: _t2, ...floor2 } = f2;
    expect(JSON.stringify(floor1)).toBe(JSON.stringify(floor2));
  });

  it('produces solvable floor', () => {
    const f = generateFloor('seed-solvable');
    const v = validateFloor(f);
    expect(v.solvable).toBe(true);
    expect(v.errors.length).toBe(0);
  });
});
