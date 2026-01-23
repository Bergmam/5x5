import { describe, expect, it } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { InventoryItem } from '../src/game/types';
import { getAbilityBarFromInventory } from '../src/game/abilities';

function teleportItem(): InventoryItem {
  return {
    id: 'teleport-orb',
    name: 'Orb of Teleportation',
    description: 'Grants the Teleport ability while carried',
    icon: '✨',
    rarity: 'epic',
    kind: 'ability-granting',
    saleValue: 80,
    abilityId: 'teleport',
  };
}

describe('teleport ability store integration', () => {
  it('uses MP when player has enough MP', () => {
    const store = useGameStore.getState();
    store.startNewGame('teleport-test-1');

    // Give player the teleport ability
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = teleportItem();
      return { 
        player: { ...s.player, mp: 50, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    const mpBefore = useGameStore.getState().player.mp;
    const hpBefore = useGameStore.getState().player.hp;
    const posBefore = { ...useGameStore.getState().player.pos };

    useGameStore.getState().castAbility(0);

    const mpAfter = useGameStore.getState().player.mp;
    const hpAfter = useGameStore.getState().player.hp;
    const posAfter = { ...useGameStore.getState().player.pos };

    // Should have used MP (25 MP cost)
    expect(mpAfter).toBe(mpBefore - 25);
    // HP should be unchanged
    expect(hpAfter).toBe(hpBefore);
    // Position should have changed
    expect(posAfter.x !== posBefore.x || posAfter.y !== posBefore.y).toBe(true);
  });

  it('uses HP when player does not have enough MP', () => {
    const store = useGameStore.getState();
    store.startNewGame('teleport-test-2');

    // Give player the teleport ability with low MP
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = teleportItem();
      return { 
        player: { ...s.player, mp: 10, hp: 100, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    const mpBefore = useGameStore.getState().player.mp;
    const hpBefore = useGameStore.getState().player.hp;
    const posBefore = { ...useGameStore.getState().player.pos };

    useGameStore.getState().castAbility(0);

    const mpAfter = useGameStore.getState().player.mp;
    const hpAfter = useGameStore.getState().player.hp;
    const posAfter = { ...useGameStore.getState().player.pos };

    // MP should be unchanged
    expect(mpAfter).toBe(mpBefore);
    // Should have used HP (25 HP cost)
    expect(hpAfter).toBe(hpBefore - 25);
    // Position should have changed
    expect(posAfter.x !== posBefore.x || posAfter.y !== posBefore.y).toBe(true);
  });

  it('does not cast if player has neither enough MP nor enough HP', () => {
    const store = useGameStore.getState();
    store.startNewGame('teleport-test-3');

    // Give player the teleport ability with low MP and HP
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = teleportItem();
      return { 
        player: { ...s.player, mp: 10, hp: 20, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    const mpBefore = useGameStore.getState().player.mp;
    const hpBefore = useGameStore.getState().player.hp;
    const posBefore = { ...useGameStore.getState().player.pos };
    const turnBefore = useGameStore.getState().turnCount;

    useGameStore.getState().castAbility(0);

    const mpAfter = useGameStore.getState().player.mp;
    const hpAfter = useGameStore.getState().player.hp;
    const posAfter = { ...useGameStore.getState().player.pos };
    const turnAfter = useGameStore.getState().turnCount;

    // Should still cast, using HP even though it's not enough
    expect(mpAfter).toBe(mpBefore); // MP unchanged
    expect(hpAfter).toBe(0); // HP reduced to 0 (20 - 25 = -5, clamped to 0)
    expect(posAfter.x !== posBefore.x || posAfter.y !== posBefore.y).toBe(true); // Position changed
    expect(turnAfter).toBe(turnBefore + 1); // Turn consumed
    expect(useGameStore.getState().gameOver).toBe(true); // Player died
  });

  it('casting teleport consumes a turn', () => {
    const store = useGameStore.getState();
    store.startNewGame('teleport-test-4');

    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = teleportItem();
      return { 
        player: { ...s.player, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    const turnBefore = useGameStore.getState().turnCount;
    useGameStore.getState().castAbility(0);
    const turnAfter = useGameStore.getState().turnCount;

    expect(turnAfter).toBe(turnBefore + 1);
  });

  it('HP cost does not reduce HP below 1', () => {
    const store = useGameStore.getState();
    store.startNewGame('teleport-test-5');

    // Give player the teleport ability with exactly 25 HP
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = teleportItem();
      return { 
        player: { ...s.player, mp: 0, hp: 25, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    useGameStore.getState().castAbility(0);

    const hpAfter = useGameStore.getState().player.hp;

    // HP should go to 0, causing death
    expect(hpAfter).toBe(0);
    expect(useGameStore.getState().gameOver).toBe(true);
    expect(useGameStore.getState().victoryMessage).toBe('You teleported yourself to death!');
  });

  it('allows lethal teleport with insufficient HP', () => {
    const store = useGameStore.getState();
    store.startNewGame('teleport-test-6');

    // Give player the teleport ability with very low HP
    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = teleportItem();
      return { 
        player: { ...s.player, mp: 0, hp: 5, inventory: inv },
        abilityBar: getAbilityBarFromInventory(inv, 8),
      };
    });

    const posBefore = { ...useGameStore.getState().player.pos };

    useGameStore.getState().castAbility(0);

    const posAfter = { ...useGameStore.getState().player.pos };
    const hpAfter = useGameStore.getState().player.hp;

    // Should teleport even though it kills the player
    expect(posAfter.x !== posBefore.x || posAfter.y !== posBefore.y).toBe(true);
    expect(hpAfter).toBe(0); // HP goes to 0 (5 - 25 = -20, clamped to 0)
    expect(useGameStore.getState().gameOver).toBe(true);
    expect(useGameStore.getState().victoryMessage).toBe('You teleported yourself to death!');
  });
});
