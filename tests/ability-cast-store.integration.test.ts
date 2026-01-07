import { describe, expect, it } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { InventoryItem } from '../src/game/types';
import { DIRECTIONS } from '../src/game/movement';
import { getAbilityBarFromInventory } from '../src/game/abilities';

function abilityItem(abilityId: 'fireball' | 'shockwave'): InventoryItem {
  return {
    id: `${abilityId}-item`,
    name: abilityId,
    description: abilityId,
    icon: abilityId === 'fireball' ? '🔥' : '💥',
    rarity: 'common',
    kind: 'ability-granting',
    abilityId,
    saleValue: 50,
  };
}

describe('abilities store integration', () => {
  it('casting consumes a turn', () => {
    const store = useGameStore.getState();
    store.startNewGame('ability-test-seed');

    // Inject an ability provider into inventory.
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = abilityItem('shockwave');
      return { player: { ...s.player, inventory: inv } };
    });

    // Recompute ability bar (mirrors what pickup/use/destroy does).
    useGameStore.setState((s) => ({ abilityBar: getAbilityBarFromInventory(s.player.inventory, 8) }));

    const before = useGameStore.getState().turnCount;
    useGameStore.getState().castAbility(0);
    const after = useGameStore.getState().turnCount;

    expect(after).toBe(before + 1);
  });

  it('lastMoveDirection drives directional casts', () => {
    const store = useGameStore.getState();
    store.startNewGame('ability-test-seed-2');

    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = abilityItem('fireball');
      return { player: { ...s.player, inventory: inv } };
    });
    useGameStore.setState((s) => ({ abilityBar: getAbilityBarFromInventory(s.player.inventory, 8) }));

    // if you cast without moving, it shouldn't consume a turn (direction unknown)
    const t0 = useGameStore.getState().turnCount;
    useGameStore.getState().castAbility(0);
    expect(useGameStore.getState().turnCount).toBe(t0);

    // set facing by attempting a move
    useGameStore.getState().movePlayer(DIRECTIONS.LEFT);
    const t1 = useGameStore.getState().turnCount;

    // now it should cast and consume a turn
    useGameStore.getState().castAbility(0);
    expect(useGameStore.getState().turnCount).toBe(t1 + 1);
  });

  it('requires enough MP and consumes MP on cast', () => {
    const store = useGameStore.getState();
    store.startNewGame('ability-mp-seed');

    // Give the player Fireball and set low MP.
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = abilityItem('fireball');
      return {
        player: { ...s.player, mp: 5, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    // Set facing so the directional precondition is satisfied.
    useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);
    const t0 = useGameStore.getState().turnCount;

    // Not enough MP: should not cast, should not consume a turn.
    useGameStore.getState().castAbility(0);
    expect(useGameStore.getState().turnCount).toBe(t0);

    // Now enough MP: should cast and consume MP.
    useGameStore.setState((s) => ({ player: { ...s.player, mp: 20 } }));
    const mpBefore = useGameStore.getState().player.mp;
    useGameStore.getState().castAbility(0);
    const mpAfter = useGameStore.getState().player.mp;
    expect(mpAfter).toBeLessThan(mpBefore);
  });
});
