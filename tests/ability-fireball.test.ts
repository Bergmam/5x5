import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../src/game/abilities';
import { DIRECTIONS } from '../src/game/movement';
import type { MapFloor } from '../src/game/types';

function floorWithEntities(entities: MapFloor['entities'], tiles: MapFloor['tiles'], seed = 't'):
  MapFloor {
  return {
    width: 5,
    height: 5,
    seed,
    tiles,
    entities,
    entrance: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
    generatedAt: new Date().toISOString(),
  };
}

function makeFloorTiles(blockAtX?: number) {
  // All floor tiles walkable, except optional wall at (blockAtX, 2)
  const tiles = [] as MapFloor['tiles'];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const isWall = blockAtX !== undefined && x === blockAtX && y === 2;
      tiles.push({
        pos: { x, y },
        kind: isWall ? 'wall' : 'floor',
        walkable: !isWall,
      });
    }
  }
  return tiles;
}

describe('ability: fireball', () => {
  it('hits the first enemy in line', () => {
    const tiles = makeFloorTiles();
    const floor = floorWithEntities(
      [
        {
          id: 'enemy-a',
          kind: 'enemy',
          pos: { x: 2, y: 2 },
          data: { hp: 30, maxHp: 30, damage: 10, armor: 0, xpValue: 1, level: 1 },
        },
        {
          id: 'enemy-b',
          kind: 'enemy',
          pos: { x: 4, y: 2 },
          data: { hp: 30, maxHp: 30, damage: 10, armor: 0, xpValue: 1, level: 1 },
        },
      ],
      tiles
    );

    const res = ABILITIES.fireball.execute({
      floor,
      playerPos: { x: 0, y: 2 },
      facing: DIRECTIONS.RIGHT,
      effectiveStats: { maxHp: 100, maxMp: 50, armor: 0, weaponDamage: 10, spellDamage: 20 },
    });

    expect(res.didCast).toBe(true);
    expect(res.hitEnemyIds).toEqual(['enemy-a']);

    const a = res.entities.find((e) => e.id === 'enemy-a');
    const b = res.entities.find((e) => e.id === 'enemy-b');

    expect((a?.data as any).hp).toBe(10);
    expect((b?.data as any).hp).toBe(30);
  });

  it('is blocked by walls', () => {
    const tiles = makeFloorTiles(1); // wall at (1,2)
    const floor = floorWithEntities(
      [
        {
          id: 'enemy-a',
          kind: 'enemy',
          pos: { x: 2, y: 2 },
          data: { hp: 30, maxHp: 30, damage: 10, armor: 0, xpValue: 1, level: 1 },
        },
      ],
      tiles
    );

    const res = ABILITIES.fireball.execute({
      floor,
      playerPos: { x: 0, y: 2 },
      facing: DIRECTIONS.RIGHT,
      effectiveStats: { maxHp: 100, maxMp: 50, armor: 0, weaponDamage: 10, spellDamage: 20 },
    });

    expect(res.didCast).toBe(true);
    expect(res.hitEnemyIds).toEqual([]);
    const a = res.entities.find((e) => e.id === 'enemy-a');
    expect((a?.data as any).hp).toBe(30);
  });
});
