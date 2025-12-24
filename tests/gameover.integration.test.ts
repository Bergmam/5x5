import { describe, expect, it } from 'vitest';

import { useGameStore } from '../src/store/gameStore';
import { DIRECTIONS } from '../src/game/movement';

// Reuse floor helper from existing store integration tests by copying minimal setup.
// We keep this test independent to avoid coupling to helper exports.
function makeOpenFloorWithEnemyNearPlayer() {
  const s0 = useGameStore.getState();
  // startNewGame would randomize; we instead clone the current floor fixture from store if present
  // and fall back to starting a new game.
  if (!s0.floor) {
    useGameStore.getState().startNewGame('test-seed');
  }
  const s1 = useGameStore.getState();
  if (!s1.floor) throw new Error('Expected floor to exist');
  const floor = {
    ...s1.floor,
    // ensure we're on an open floor to avoid blocked movement influencing the scenario
    tiles: s1.floor.tiles.map((t: any) => ({ ...t, walkable: true, kind: 'floor' })),
  };

  // Put a single enemy adjacent so it will attack.
  const enemy = floor.entities.find((e: any) => e.kind === 'enemy');
  if (!enemy) throw new Error('Expected at least one enemy entity');
  const enemyId = enemy.id;
  floor.entities = floor.entities
    .filter((e: any) => e.id === enemyId || e.kind !== 'enemy')
    .map((e: any) => {
      if (e.id !== enemyId) return e;
      return {
        ...e,
        pos: { x: 1, y: 0 },
        data: {
          ...(e.data as any),
          damage: 50,
          spawnPos: { x: 1, y: 0 },
          state: { mode: 'follow', lastHp: 10 },
        },
      };
    });

  return { floor, enemyId };
}

describe('game over (death) integration', () => {
  it('sets gameOver and message when enemy attack reduces HP to 0', () => {
    const { floor } = makeOpenFloorWithEnemyNearPlayer();

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
        hp: 5,
      },
      floor,
    });

    // Player takes a no-op action so enemy gets a turn and attacks.
    useGameStore.getState().movePlayer(DIRECTIONS.LEFT);

    const s = useGameStore.getState();
    expect(s.player.hp).toBe(0);
    expect(s.gameOver).toBe(true);
    expect(s.victoryMessage).toBe('You died.');
  });

  it('sets gameOver and message when trap damage reduces HP to 0', () => {
    // Build a small floor with a trap to the right of the player.
    useGameStore.getState().startNewGame('trap-seed');
    const s0 = useGameStore.getState();
    if (!s0.floor) throw new Error('Expected floor to exist');
    const floor = { ...s0.floor };

    // Force a trap tile at (1,0)
    const idx = 0 * floor.width + 1;
    floor.tiles = floor.tiles.map((t: any, i: number) =>
      i === idx ? { ...t, walkable: true, kind: 'trap' } : { ...t, walkable: true, kind: 'floor' }
    );

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
        hp: 10,
      },
      floor,
    });

    // Move onto trap.
    useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);

    const s = useGameStore.getState();
    expect(s.player.hp).toBe(0);
    expect(s.gameOver).toBe(true);
    expect(s.victoryMessage).toBe('You died.');
  });

  it('blocks further turns after gameOver', () => {
    const { floor } = makeOpenFloorWithEnemyNearPlayer();
    useGameStore.setState({
      gameStarted: true,
      gameOver: true,
      victoryMessage: 'You died.',
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
        hp: 0,
      },
      floor,
    });

    const before = useGameStore.getState().turnCount;
    const r = useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);
    expect(r.success).toBe(false);
    expect(useGameStore.getState().turnCount).toBe(before);
  });
});
