import { describe, it, expect } from 'vitest';
import { runEnemyTurn } from '../src/game/enemyAI';
import { MapFloor, EnemyData, EntityBase } from '../src/game/types';

function makeFloorWithEnemy(playerPos: {x:number;y:number}, enemyPos: {x:number;y:number}, enemyData?: Partial<EnemyData>): MapFloor {
  const width = 5, height = 5;
  const tiles = Array.from({ length: width * height }, (_, i) => ({
    kind: 'floor' as const,
    pos: { x: i % width, y: Math.floor(i / width) },
    walkable: true,
  }));
  const enemy: EntityBase = {
    id: 'enemy-1',
    kind: 'enemy',
    pos: { ...enemyPos },
    data: {
      hp: 10,
      maxHp: 10,
      damage: 5,
      armor: 0,
      xpValue: 0,
      level: 1,
      ai: 'patrol',
      spawnPos: { ...enemyPos },
      state: { mode: 'patrol', lastHp: 10 },
      ...enemyData,
    } as EnemyData,
  };
  const floor: MapFloor = {
    width,
    height,
    tiles,
    entrance: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
    entities: [enemy],
    seed: 'test-seed',
    generatedAt: new Date().toISOString(),
  };
  // Attach player via payload later
  return floor;
}

describe('enemy aggro emission', () => {
  it('emits enemy-aggro only on transition into follow (proximity trigger)', () => {
    const playerPos = { x: 2, y: 2 };
    const enemyPos = { x: 2, y: 4 }; // distance 2 -> should follow
    const floor = makeFloorWithEnemy(playerPos, enemyPos);

    // First turn: patrol -> follow, expect aggro emitted
    const r1 = runEnemyTurn({ floor, playerPos });
    expect(r1.interaction?.type).toBe('enemy-aggro');

    // Second turn: already in follow, should NOT re-emit aggro
    const r2 = runEnemyTurn({ floor: r1.floor, playerPos });
    expect(r2.interaction?.type).not.toBe('enemy-aggro');
  });

  it('emits enemy-aggro only once when damage triggers follow', () => {
    const playerPos = { x: 0, y: 0 };
    const enemyPos = { x: 0, y: 2 }; // distance 2
    const floor = makeFloorWithEnemy(playerPos, enemyPos, { state: { mode: 'patrol', lastHp: 10 }, hp: 8 });

    // Took damage (hp < lastHp) -> should transition to follow and emit aggro
  const r1 = runEnemyTurn({ floor, playerPos });
    expect(r1.interaction?.type).toBe('enemy-aggro');

    // Maintain hp snapshot so no new damage perceived; should not re-emit
    const r2 = runEnemyTurn({ floor: r1.floor, playerPos });
    expect(r2.interaction?.type).not.toBe('enemy-aggro');
  });
});
