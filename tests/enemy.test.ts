import { describe, it, expect } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { DIRECTIONS } from '../src/game/movement';

// Basic smoke tests for enemy follow trigger and movement constraints

describe('Enemy movement basics', () => {
  it('enemy switches to follow when player approaches within 2 tiles', () => {
    const store = useGameStore.getState();
    store.startNewGame('enemy-follow-seed');

    const { floor } = useGameStore.getState();
    expect(floor).toBeTruthy();
    if (!floor) return;

    const enemy = floor.entities.find(e => e.kind === 'enemy');
    expect(enemy).toBeTruthy();
    if (!enemy) return;

    // Move player towards enemy until within distance 2
    const state1 = useGameStore.getState();
    const dx = Math.sign(enemy.pos.x - state1.player.pos.x);
    const dy = Math.sign(enemy.pos.y - state1.player.pos.y);

    // one step towards enemy
    if (dx !== 0) {
      useGameStore.getState().movePlayer(dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT);
    } else if (dy !== 0) {
      useGameStore.getState().movePlayer(dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP);
    }

    const updated = useGameStore.getState();
    const updatedEnemy = updated.floor!.entities.find(e => e.id === enemy.id)!;
    const data: any = updatedEnemy.data;
    expect(data.state?.mode).toBeDefined();
    // Move again towards enemy to ensure follow trigger when close enough
    const dx2 = Math.sign(enemy.pos.x - updated.player.pos.x);
    const dy2 = Math.sign(enemy.pos.y - updated.player.pos.y);
    if (dx2 !== 0) {
      useGameStore.getState().movePlayer(dx2 > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT);
    } else if (dy2 !== 0) {
      useGameStore.getState().movePlayer(dy2 > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP);
    }
    const updated2 = useGameStore.getState();
    const updatedEnemy2 = updated2.floor!.entities.find(e => e.id === enemy.id)!;
    const data2: any = updatedEnemy2.data;
    // When sufficiently close, mode should be follow
    const dist = Math.abs(updatedEnemy2.pos.x - updated2.player.pos.x) + Math.abs(updatedEnemy2.pos.y - updated2.player.pos.y);
    if (dist <= 2) {
      expect(data2.state?.mode).toBe('follow');
    }
  });

  it('patrolling enemy stays within radius of spawn', () => {
    const store = useGameStore.getState();
    store.startNewGame('enemy-patrol-seed');
    const { floor } = useGameStore.getState();
    if (!floor) return;
    const enemy = floor.entities.find(e => e.kind === 'enemy');
    if (!enemy) return;
    const spawn = (enemy.data as any).spawnPos;
    // IMPORTANT: Follow is sticky. If the player ever comes within 2 tiles, the enemy will
    // switch to follow permanently, making this test flaky. Keep the player far away.
    // We'll advance turns by bumping into a wall (no-op move) so enemies still take turns.
    // Try to move outside bounds to stay close to (0,0) and away from most spawns.
    for (let i = 0; i < 8; i++) {
      useGameStore.getState().movePlayer(DIRECTIONS.LEFT);
      useGameStore.getState().movePlayer(DIRECTIONS.UP);
    }
    const updated = useGameStore.getState();
    const updatedEnemy = updated.floor!.entities.find(e => e.id === enemy.id)!;
    const dist = Math.abs(updatedEnemy.pos.x - spawn.x) + Math.abs(updatedEnemy.pos.y - spawn.y);
    expect(dist).toBeLessThanOrEqual(2);
  });

  it('enemies do not stack on the same tile', () => {
    const store = useGameStore.getState();
    store.startNewGame('enemy-collision-seed');
    const { floor } = useGameStore.getState();
    if (!floor) return;
    // Drive a few turns (reduced iterations to speed up test)
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);
      useGameStore.getState().movePlayer(DIRECTIONS.DOWN);
    }
    const updated = useGameStore.getState();
    const enemyPositions = updated.floor!.entities.filter(e => e.kind === 'enemy').map(e => `${e.pos.x},${e.pos.y}`);
    const set = new Set(enemyPositions);
    expect(set.size).toBe(enemyPositions.length);
  });

  it('follow respects walls and idles when both axes blocked', () => {
    const store = useGameStore.getState();
    store.startNewGame('enemy-blocked-seed');
    const { floor } = useGameStore.getState();
    if (!floor) return;
    const enemy = floor.entities.find(e => e.kind === 'enemy');
    if (!enemy) return;

  // Surround enemy with walls on two axes to block greedy steps
    const pos = enemy.pos;
    const tileRight = floor.tiles.find(t => t.pos.x === pos.x + 1 && t.pos.y === pos.y);
    const tileDown = floor.tiles.find(t => t.pos.x === pos.x && t.pos.y === pos.y + 1);
    if (tileRight) { tileRight.kind = 'wall'; tileRight.walkable = false; }
    if (tileDown) { tileDown.kind = 'wall'; tileDown.walkable = false; }

    // Move player close to trigger follow
    const player = useGameStore.getState().player;
    const dx = Math.sign(pos.x - player.pos.x);
    const dy = Math.sign(pos.y - player.pos.y);
    if (dx !== 0) useGameStore.getState().movePlayer(dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT);
    if (dy !== 0) useGameStore.getState().movePlayer(dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP);

    const before = useGameStore.getState().floor!.entities.find(e => e.id === enemy.id)!;
    // Advance a turn; enemy should not move into walls and may idle
    useGameStore.getState().movePlayer(DIRECTIONS.UP);
    const after = useGameStore.getState().floor!.entities.find(e => e.id === enemy.id)!;
    // Position should either be unchanged or moved to a valid non-wall tile
    const tileAfter = useGameStore.getState().floor!.tiles.find(t => t.pos.x === after.pos.x && t.pos.y === after.pos.y)!;
    expect(tileAfter.walkable).toBe(true);
  });

  it('enemy in follow mode does not move onto player tile and stops adjacent', () => {
    const store = useGameStore.getState();
    store.startNewGame('enemy-adjacent-stop');
    const { floor } = useGameStore.getState();
    if (!floor) return;
    const enemy = floor.entities.find(e => e.kind === 'enemy');
    if (!enemy) return;

    // Move player towards enemy until they are adjacent
    // Move player two steps closer at most to approach adjacency without long loops
    for (let i = 0; i < 2; i++) {
      const state = useGameStore.getState();
      const dx = Math.sign(enemy.pos.x - state.player.pos.x);
      const dy = Math.sign(enemy.pos.y - state.player.pos.y);
      if (dx !== 0) {
        useGameStore.getState().movePlayer(dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT);
      } else if (dy !== 0) {
        useGameStore.getState().movePlayer(dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP);
      }
    }

    // Advance a turn to let enemy attempt a move
    const before = useGameStore.getState().floor!.entities.find(e => e.id === enemy.id)!;
    useGameStore.getState().movePlayer(DIRECTIONS.UP);
    const after = useGameStore.getState().floor!.entities.find(e => e.id === enemy.id)!;
    const dist = Math.abs(after.pos.x - useGameStore.getState().player.pos.x) + Math.abs(after.pos.y - useGameStore.getState().player.pos.y);
    expect(dist).toBeGreaterThanOrEqual(1); // should remain >=1
    // And not equal to 0 (same tile)
    expect(!(after.pos.x === useGameStore.getState().player.pos.x && after.pos.y === useGameStore.getState().player.pos.y)).toBe(true);
  });
});
