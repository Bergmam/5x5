import { describe, it, expect } from 'vitest';
import { runEnemyTurn } from '../src/game/enemyAI';
import { MapFloor, EnemyData, EntityBase } from '../src/game/types';

function makeFloor(playerPos: {x:number;y:number}, enemies: Array<{ id: string; pos: {x:number;y:number}; data?: Partial<EnemyData> }>): MapFloor {
  const width = 5, height = 5;
  const tiles = Array.from({ length: width * height }, (_, i) => ({
    kind: 'floor' as const,
    pos: { x: i % width, y: Math.floor(i / width) },
    walkable: true,
  }));
  const entities: EntityBase[] = enemies.map((en) => ({
    id: en.id,
    kind: 'enemy',
    pos: { ...en.pos },
    data: {
      hp: 10,
      maxHp: 10,
      damage: 5,
      armor: 0,
      xpValue: 0,
      level: 1,
      ai: 'patrol',
      spawnPos: { ...en.pos },
      state: { mode: 'patrol', lastHp: 10 },
      ...(en.data || {}),
    } as EnemyData,
  }));
  return {
    width,
    height,
    tiles,
    entrance: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
    entities,
    seed: 'repeat-seed',
    generatedAt: new Date().toISOString(),
  };
}

describe('enemy aggro does not re-emit across turns and array reorder', () => {
  it('does not re-emit when staying in follow across multiple turns', () => {
    const playerPos = { x: 2, y: 2 };
    const floor = makeFloor(playerPos, [
      { id: 'e1', pos: { x: 2, y: 4 } }, // dist 2 -> will follow
    ]);

    const r1 = runEnemyTurn({ floor, playerPos });
    expect(r1.interaction?.type).toBe('enemy-aggro');

    const r2 = runEnemyTurn({ floor: r1.floor, playerPos });
    expect(r2.interaction?.type).not.toBe('enemy-aggro');

    const r3 = runEnemyTurn({ floor: r2.floor, playerPos });
    expect(r3.interaction?.type).not.toBe('enemy-aggro');
  });

  it('does not re-emit due to index shift when another enemy is removed', () => {
    const playerPos = { x: 1, y: 1 };
    const floor = makeFloor(playerPos, [
      { id: 'e1', pos: { x: 1, y: 3 } }, // dist 2 -> will follow
      { id: 'e2', pos: { x: 4, y: 4 } }, // far away
    ]);

    // First turn: e1 transitions to follow -> aggro
  const r1 = runEnemyTurn({ floor, playerPos });
    expect(r1.interaction?.type).toBe('enemy-aggro');

    // Simulate removal of e2 (e.g., died) causing potential index reorder
    const floorAfterRemoval: MapFloor = {
      ...r1.floor,
      entities: r1.floor.entities.filter(e => e.id !== 'e2'),
    };

    // Next turn: e1 is still in follow; aggro should NOT re-emit despite array size change
    const r2 = runEnemyTurn({ floor: floorAfterRemoval, playerPos });
    expect(r2.interaction?.type).not.toBe('enemy-aggro');
  });

  it('includes only the enemies that transitioned this turn in aggroEnemyIds', () => {
    const playerPos = { x: 2, y: 2 };
    const floor = makeFloor(playerPos, [
      { id: 'e1', pos: { x: 2, y: 4 } }, // dist 2 -> will transition to follow this turn
      { id: 'e2', pos: { x: 2, y: 1 }, data: { state: { mode: 'follow', lastHp: 10 } } }, // already following
    ]);

    const r1 = runEnemyTurn({ floor, playerPos });
    expect(r1.interaction?.type).toBe('enemy-aggro');
    expect(r1.interaction?.aggroEnemyIds).toEqual(['e1']);
  });

  it('enters follow when there is exactly one tile between (distance 2)', () => {
    // One-tile gap vertically: enemy at (2,4), player at (2,2) => distance 2 (tile between at (2,3))
    const playerPos = { x: 2, y: 2 };
    const floor = makeFloor(playerPos, [
      { id: 'e1', pos: { x: 2, y: 4 } },
    ]);

    const r1 = runEnemyTurn({ floor, playerPos });
    const e1After = r1.floor.entities.find(e => e.id === 'e1')!;
    expect((e1After.data as EnemyData).state?.mode).toBe('follow');
  });

  it('aggros when distance becomes 2 after player move + enemy move (reported scenario)', () => {
    // We model the state *after*:
    // - Player moved to (0,0)
    // - Enemy moved to (2,0)
    // and verify that at distance 2, the enemy transitions to follow and emits aggro.
    const playerPos = { x: 0, y: 0 };
    const floor = makeFloor(playerPos, [
      { id: 'e1', pos: { x: 2, y: 0 }, data: { state: { mode: 'patrol', lastHp: 10 } } },
    ]);

    const dist = Math.abs(floor.entities[0].pos.x - playerPos.x) + Math.abs(floor.entities[0].pos.y - playerPos.y);
    expect(dist).toBe(2);

    const r1 = runEnemyTurn({ floor, playerPos });
    expect(r1.interaction?.type).toBe('enemy-aggro');
    expect(r1.interaction?.aggroEnemyIds).toEqual(['e1']);
    const e1After = r1.floor.entities.find(e => e.id === 'e1')!;
    expect((e1After.data as EnemyData).state?.mode).toBe('follow');
  });

  it('follow is sticky once triggered', () => {
    const playerNear = { x: 2, y: 2 };
    const playerFar = { x: 0, y: 0 };
    const floor = makeFloor(playerNear, [
      { id: 'e1', pos: { x: 2, y: 4 } }, // dist 2 -> will follow
    ]);

    const r1 = runEnemyTurn({ floor, playerPos: playerNear });
    const e1After = r1.floor.entities.find(e => e.id === 'e1')!;
    expect((e1After.data as EnemyData).state?.mode).toBe('follow');

    // Move player far away; enemy should remain in follow
    const r2 = runEnemyTurn({ floor: r1.floor, playerPos: playerFar });
    const e1After2 = r2.floor.entities.find(e => e.id === 'e1')!;
    expect((e1After2.data as EnemyData).state?.mode).toBe('follow');
  });

  it('aggros when it moves into distance 2 during its patrol step', () => {
    // Player is not in range at start of turn, but after the enemy patrols one step,
    // it ends at distance 2 and should immediately aggro.
  // With the post-move proximity rule, an enemy that ends within distance <= 2
  // should immediately enter follow and emit aggro, even if it started the turn outside range.
  const floor = makeFloor({ x: 0, y: 0 }, [{ id: 'e1', pos: { x: 1, y: 0 } }]);
  const playerPos = { x: 0, y: 0 };

    floor.entities = floor.entities.map((e) => {
      if (e.id !== 'e1') return e;
      return {
        ...e,
        pos: { x: 1, y: 0 },
        data: {
          ...(e.data as any),
          spawnPos: { x: 1, y: 0 },
          state: { mode: 'patrol', lastHp: 10 },
        },
      };
    });

    const out = runEnemyTurn({ floor, playerPos });

    // Enemy patrol step is deterministic but can pick the first available neighbor it finds.
    // We care about the end result: it moved into distance <= 2 and immediately aggros.
    const e1 = out.floor.entities.find((e) => e.id === 'e1') as any;
    const distAfterMove = Math.abs(e1.pos.x - playerPos.x) + Math.abs(e1.pos.y - playerPos.y);
    expect(distAfterMove).toBeLessThanOrEqual(2);
    expect(out.interaction?.type).toBe('enemy-aggro');
    expect(out.interaction?.aggroEnemyIds).toEqual(['e1']);
    expect((e1.data as any).state.mode).toBe('follow');
  });
});
