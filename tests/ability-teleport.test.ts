import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../src/game/abilities';
import type { MapFloor, Tile } from '../src/game/types';

function createTestFloor(width: number, height: number): MapFloor {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        pos: { x, y },
        kind: 'floor',
        walkable: true,
      });
    }
  }

  return {
    width,
    height,
    seed: 'test',
    tiles,
    entities: [],
    entrance: { x: 0, y: 0 },
    exit: { x: width - 1, y: height - 1 },
    generatedAt: new Date().toISOString(),
  };
}

describe('teleport ability', () => {
  it('teleports player to a random walkable tile', () => {
    const floor = createTestFloor(5, 5);
    const playerPos = { x: 2, y: 2 };

    const res = ABILITIES.teleport.execute({
      floor,
      playerPos,
      facing: null,
      effectiveStats: { maxHp: 100, maxMp: 50, armor: 0, weaponDamage: 10, spellDamage: 20, hpPerFloor: 0 },
    });

    expect(res.didCast).toBe(true);
    expect(res.interaction?.type).toBe('ability');
    expect(res.interaction?.abilityId).toBe('teleport');
    expect(res.interaction?.targetPos).toBeDefined();
    
    // Target should be different from starting position
    const targetPos = res.interaction!.targetPos;
    expect(targetPos.x !== playerPos.x || targetPos.y !== playerPos.y).toBe(true);
    
    // Target should be in bounds
    expect(targetPos.x).toBeGreaterThanOrEqual(0);
    expect(targetPos.x).toBeLessThan(5);
    expect(targetPos.y).toBeGreaterThanOrEqual(0);
    expect(targetPos.y).toBeLessThan(5);
  });

  it('does not teleport if no valid tiles available', () => {
    const floor = createTestFloor(1, 1);
    const playerPos = { x: 0, y: 0 };

    const res = ABILITIES.teleport.execute({
      floor,
      playerPos,
      facing: null,
      effectiveStats: { maxHp: 100, maxMp: 50, armor: 0, weaponDamage: 10, spellDamage: 20, hpPerFloor: 0 },
    });

    expect(res.didCast).toBe(false);
  });

  it('does not teleport onto tiles with entities', () => {
    const floor = createTestFloor(3, 3);
    
    // Fill most tiles with enemies
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (x === 1 && y === 1) continue; // Player position
        if (x === 0 && y === 0) continue; // Leave one free tile
        
        floor.entities.push({
          id: `enemy-${x}-${y}`,
          kind: 'enemy',
          pos: { x, y },
          data: { hp: 10, maxHp: 10, damage: 5, armor: 0, xpValue: 1, level: 1 },
        });
      }
    }

    const playerPos = { x: 1, y: 1 };

    const res = ABILITIES.teleport.execute({
      floor,
      playerPos,
      facing: null,
      effectiveStats: { maxHp: 100, maxMp: 50, armor: 0, weaponDamage: 10, spellDamage: 20, hpPerFloor: 0 },
    });

    expect(res.didCast).toBe(true);
    
    // Should only teleport to the one free tile at (0, 0)
    const targetPos = res.interaction!.targetPos;
    expect(targetPos.x).toBe(0);
    expect(targetPos.y).toBe(0);
  });
});
