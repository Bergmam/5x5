import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../src/game/abilities';
import type { MapFloor } from '../src/game/types';

function makeTiles(): MapFloor['tiles'] {
  const tiles: MapFloor['tiles'] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      tiles.push({ pos: { x, y }, kind: 'floor', walkable: true });
    }
  }
  return tiles;
}

function floorWithEntities(entities: MapFloor['entities']): MapFloor {
  return {
    width: 5,
    height: 5,
    seed: 't',
    tiles: makeTiles(),
    entities,
    entrance: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
    generatedAt: new Date().toISOString(),
  };
}

describe('ability: shockwave', () => {
  it('hits enemies within manhattan distance <= 2', () => {
    const floor = floorWithEntities([
      {
        id: 'enemy-1',
        kind: 'enemy',
        pos: { x: 4, y: 3 }, // dist 1 from player (4,4)
        data: { hp: 30, maxHp: 30, damage: 10, armor: 0, xpValue: 1, level: 1 },
      },
      {
        id: 'enemy-2',
        kind: 'enemy',
        pos: { x: 4, y: 2 }, // dist 2 from player (4,4)
        data: { hp: 30, maxHp: 30, damage: 10, armor: 0, xpValue: 1, level: 1 },
      },
      {
        id: 'enemy-3',
        kind: 'enemy',
        pos: { x: 0, y: 0 }, // dist 6
        data: { hp: 30, maxHp: 30, damage: 10, armor: 0, xpValue: 1, level: 1 },
      },
    ]);

    const res = ABILITIES.shockwave.execute({
      floor,
      playerPos: { x: 4, y: 4 },
      facing: null,
      effectiveStats: { maxHp: 100, maxMp: 50, armor: 0, weaponDamage: 10, spellDamage: 20 },
    });

    expect(res.didCast).toBe(true);
    expect(res.hitEnemyIds?.sort()).toEqual(['enemy-1', 'enemy-2'].sort());

    const e1 = res.entities.find((e) => e.id === 'enemy-1');
    const e2 = res.entities.find((e) => e.id === 'enemy-2');
    const e3 = res.entities.find((e) => e.id === 'enemy-3');

    expect((e1?.data as any).hp).toBe(10);
    expect((e2?.data as any).hp).toBe(10);
    expect((e3?.data as any).hp).toBe(30);
  });
});
