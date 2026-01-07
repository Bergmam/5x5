import { describe, it, expect } from 'vitest';
import { shouldSpawnTemplate, FLOOR_TEMPLATES } from '../src/game/templates';

describe('Shop Spawn Logic', () => {
  const shopTemplate = FLOOR_TEMPLATES.shop;

  it('should not spawn on floors 1-4', () => {
    for (let floor = 1; floor <= 4; floor++) {
      const result = shouldSpawnTemplate(shopTemplate, floor, 0.5);
      expect(result).toBe(false);
    }
  });

  it('should have chance to spawn on floor 5', () => {
    // With random value 0.5 (< 0.75), should spawn
    expect(shouldSpawnTemplate(shopTemplate, 5, 0.5)).toBe(true);
    // With random value 0.8 (> 0.75), should not spawn
    expect(shouldSpawnTemplate(shopTemplate, 5, 0.8)).toBe(false);
  });

  it('should not spawn on non-multiple-of-5 floors above 5', () => {
    const nonMultiples = [6, 7, 8, 9, 11, 12, 13, 14];
    for (const floor of nonMultiples) {
      const result = shouldSpawnTemplate(shopTemplate, floor, 0.5);
      expect(result).toBe(false);
    }
  });

  it('should have chance to spawn on multiples of 5', () => {
    const multiples = [5, 10, 15, 20, 25, 30];
    for (const floor of multiples) {
      // With favorable random value, should spawn
      expect(shouldSpawnTemplate(shopTemplate, floor, 0.5)).toBe(true);
      // With unfavorable random value, should not spawn
      expect(shouldSpawnTemplate(shopTemplate, floor, 0.8)).toBe(false);
    }
  });

  it('should respect the 75% spawn chance', () => {
    // Edge case: exactly at the boundary
    expect(shouldSpawnTemplate(shopTemplate, 10, 0.74)).toBe(true);
    expect(shouldSpawnTemplate(shopTemplate, 10, 0.75)).toBe(false);
    expect(shouldSpawnTemplate(shopTemplate, 10, 0.76)).toBe(false);
  });
});
