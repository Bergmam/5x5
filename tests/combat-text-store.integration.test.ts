import { describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { EnemyData } from '../src/game/types';

vi.useFakeTimers();

describe('combat text floaters (store)', () => {
  it('emits a damage floater for player melee, including 0 damage, and expires it', () => {
    const store = useGameStore.getState();
    store.startNewGame('floater-seed');

    // Put a super-armored enemy next to player, so damage becomes 0.
    useGameStore.setState((s) => {
      if (!s.floor) return s;
      const p = s.player.pos;
      const armoredEnemy = {
        id: 'enemy-test',
        kind: 'enemy' as const,
        pos: { x: Math.min(4, p.x + 1), y: p.y },
        data: { hp: 30, maxHp: 30, damage: 10, armor: 999, xpValue: 1, level: 1 } satisfies EnemyData,
      };
      return {
        floor: { ...s.floor, entities: [...s.floor.entities, armoredEnemy] },
      };
    });

    // Attack by attempting to move into enemy.
    useGameStore.getState().movePlayer({ x: 1, y: 0 });

    const events = useGameStore.getState().combatText;
    expect(events.length).toBeGreaterThan(0);
    const e = events.find((x) => x.kind === 'damage');
    expect(e).toBeTruthy();
    expect(e?.amount).toBe(0);

    // fast-forward expiry
    vi.advanceTimersByTime(700);
    expect(useGameStore.getState().combatText.find((x) => x.id === e?.id)).toBeUndefined();
  });

  it('emits one floater per enemy attacker (enemy melee)', () => {
    const store = useGameStore.getState();
    store.startNewGame('floater-seed-2');

    // Place two enemies adjacent to player, and force enemy AI to attack by setting them to follow.
    useGameStore.setState((s) => {
      if (!s.floor) return s;
      const p = s.player.pos;
      const e1 = {
        id: 'enemy-a',
        kind: 'enemy' as const,
        pos: { x: Math.max(0, p.x - 1), y: p.y },
        data: { hp: 30, maxHp: 30, damage: 0, armor: 0, xpValue: 1, level: 1, state: { mode: 'follow', lastHp: 30 } } satisfies EnemyData,
      };
      const e2 = {
        id: 'enemy-b',
        kind: 'enemy' as const,
        pos: { x: Math.min(4, p.x + 1), y: p.y },
        data: { hp: 30, maxHp: 30, damage: 0, armor: 0, xpValue: 1, level: 1, state: { mode: 'follow', lastHp: 30 } } satisfies EnemyData,
      };
      return {
        floor: { ...s.floor, entities: [...s.floor.entities, e1, e2] },
      };
    });

    // Consume a player turn (blocked move is still a turn) so enemies act.
    useGameStore.getState().movePlayer({ x: 0, y: -1 });

    const enemyFloaters = useGameStore.getState().combatText.filter((x) => x.icon === '⚔');
    // There may also be player/melee floaters depending on collisions; assert at least 2 enemy ones.
    expect(enemyFloaters.length).toBeGreaterThanOrEqual(2);
  });
});
