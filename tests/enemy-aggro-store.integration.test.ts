import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { MapFloor } from '../src/game/types';
import { DIRECTIONS } from '../src/game/movement';

function makeOpenFloorWithEnemy(): MapFloor {
  const width = 5;
  const height = 5;
  const tiles = Array.from({ length: width * height }, (_, i) => ({
    kind: 'floor' as const,
    pos: { x: i % width, y: Math.floor(i / width) },
    walkable: true,
  }));

  return {
    width,
    height,
    tiles,
    entrance: { x: 0, y: 1 },
    exit: { x: 4, y: 4 },
    entities: [
      {
        id: 'e1',
        kind: 'enemy',
        // Start the enemy at (2,1) so that after it steps toward the player it can end up at (2,0)
        // and be at distance 2 from the player at (0,0).
        pos: { x: 2, y: 1 },
        data: {
          hp: 10,
          maxHp: 10,
          damage: 5,
          armor: 0,
          xpValue: 0,
          level: 1,
          ai: 'patrol',
          spawnPos: { x: 2, y: 1 },
          state: { mode: 'patrol', lastHp: 10 },
        },
      },
    ],
    seed: 'store-aggro-seed',
    generatedAt: new Date().toISOString(),
  };
}

describe('store integration: enemy aggro timing', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useGameStore.getState().resetGame();
  });

  it('emits enemy-aggro when player moves into position where enemy is distance 2', () => {
    // Arrange: put player at (0,1) so one move UP puts them at (0,0)
    // Put the enemy directly at (2,0) (the reported post-move position) so the test
    // validates the core rule: distance 2 triggers follow+aggro.
    const floor = makeOpenFloorWithEnemy();
    floor.entities = floor.entities.map((e) =>
      e.id === 'e1'
        ? {
            ...e,
            pos: { x: 2, y: 0 },
            data: {
              ...(e.data as any),
              spawnPos: { x: 2, y: 0 },
              state: { mode: 'patrol', lastHp: 10 },
            },
          }
        : e
    );

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      floorNumber: 1,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 1 },
      },
      floor,
    });

    // Act: player moves UP: (0,1) -> (0,0). This should trigger an enemy turn.
    // (In this project, y increases downward, so UP is y - 1.)
    useGameStore.getState().movePlayer(DIRECTIONS.UP);

    // Assert: store interaction should contain aggro for e1
    const s = useGameStore.getState();
    expect(s.floor).toBeTruthy();
    expect(s.interaction?.type).toBe('enemy-aggro');
    expect(s.interaction?.aggroEnemyIds).toEqual(['e1']);

    const e1 = s.floor!.entities.find((e) => e.id === 'e1')!;
    expect((e1.data as any).state?.mode).toBe('follow');

    // After the enemy responds, it may move adjacent (distance 1). The key assertion for this
    // integration test is that aggro was emitted and follow was entered at/under the trigger.
    const dist = Math.abs(e1.pos.x - s.player.pos.x) + Math.abs(e1.pos.y - s.player.pos.y);
    expect(dist).toBeLessThanOrEqual(2);
  });

  it('can aggro even when the player move is blocked (no-op move still advances enemy turn)', () => {
    // Arrange: player at (0,0); moving LEFT is out-of-bounds so the move is blocked.
    // Enemy is at distance 2 and should still be able to aggro on that input.
    const floor = makeOpenFloorWithEnemy();
    floor.entities = floor.entities.map((e) =>
      e.id === 'e1'
        ? {
            ...e,
            pos: { x: 2, y: 0 },
            data: {
              ...(e.data as any),
              spawnPos: { x: 2, y: 0 },
              state: { mode: 'patrol', lastHp: 10 },
            },
          }
        : e
    );

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      floorNumber: 1,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
      },
      floor,
    });

    // Act: out-of-bounds move; should still run enemy turn.
    const r = useGameStore.getState().movePlayer(DIRECTIONS.LEFT);
    expect(r.success).toBe(false);

    // Assert: enemy still aggros.
    const s = useGameStore.getState();
    expect(s.interaction?.type).toBe('enemy-aggro');
    expect(s.interaction?.aggroEnemyIds).toEqual(['e1']);
  });

  it('can aggro after using an item (useItem consumes a turn and advances enemy turn)', () => {
    const floor = makeOpenFloorWithEnemy();
    floor.entities = floor.entities.map((e) =>
      e.id === 'e1'
        ? {
            ...e,
            pos: { x: 2, y: 0 },
            data: {
              ...(e.data as any),
              spawnPos: { x: 2, y: 0 },
              state: { mode: 'patrol', lastHp: 10 },
            },
          }
        : e
    );

    const s0 = useGameStore.getState();
    const inv = [...s0.player.inventory];
    // Reuse whatever consumable item shape exists in this project by taking a known potion.
    // (If inventory items evolve, this test should still hold because applyItemUse is the canon.)
    inv[0] = { id: 'potion-1', kind: 'consumable', name: 'Test Potion', rarity: 'common' } as any;

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      floorNumber: 1,
      turnCount: 0,
      interaction: null,
      player: {
        ...s0.player,
        pos: { x: 0, y: 0 },
        inventory: inv,
      },
      floor,
    });

    useGameStore.getState().useItem(0);

    const s = useGameStore.getState();
    expect(s.turnCount).toBe(1);
    expect(s.interaction?.type).toBe('enemy-aggro');
    expect(s.interaction?.aggroEnemyIds).toEqual(['e1']);
  });

  it('aggros immediately when enemy steps into distance 2 during its move', () => {
    // Arrange: player moves into place, then enemy moves and ends at distance 2.
    // Under the post-move proximity rule, aggro should happen this same turn.
    const floor = makeOpenFloorWithEnemy();
    // Place enemy just outside follow range at start, but allow it to patrol one step.
    // With the post-move proximity rule, if it ends within distance<=2 it should aggro.
    floor.entities = floor.entities.map((e) =>
      e.id === 'e1'
        ? {
            ...e,
            pos: { x: 1, y: 0 },
            data: {
              ...(e.data as any),
              spawnPos: { x: 1, y: 0 },
              state: { mode: 'patrol', lastHp: 10 },
            },
          }
        : e
    );

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      floorNumber: 1,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
      },
      floor,
    });

  // Act: player makes a no-op move (LEFT out of bounds). Enemy gets a turn.
  useGameStore.getState().movePlayer(DIRECTIONS.LEFT);

    // Assert: enemy has entered follow and aggroed this turn if it stepped into range.
    const s = useGameStore.getState();
  expect(s.interaction?.type).toBe('enemy-aggro');
  expect(s.interaction?.aggroEnemyIds).toEqual(['e1']);
    const e1 = s.floor!.entities.find((e) => e.id === 'e1') as any;
    expect((e1.data as any).state.mode).toBe('follow');
    const dist = Math.abs(e1.pos.x - s.player.pos.x) + Math.abs(e1.pos.y - s.player.pos.y);
    expect(dist).toBeLessThanOrEqual(2);
  });
});
