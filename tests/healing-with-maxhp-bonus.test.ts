import { describe, it, expect } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { getItemById } from '../src/data/itemLoader';

describe('Healing with maxHp bonus items', () => {
  it('allows healing potion to heal beyond base maxHp when Heart Amulet is equipped', () => {
    useGameStore.getState().startNewGame('heal-test-seed');

    // Get Heart Amulet (+20 maxHp) and Healing Potion
    const heartAmulet = getItemById('heart-amulet');
    const healingPotion = getItemById('healing-potion');
    
    expect(heartAmulet).toBeTruthy();
    expect(healingPotion).toBeTruthy();

    // Set up player with Heart Amulet and low HP
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        hp: 95, // 5 HP below base max
        maxHp: 100, // base maxHp
        inventory: [heartAmulet, healingPotion, ...Array(23).fill(null)],
      },
    }));

    const stateBefore = useGameStore.getState();
    // Effective maxHp should be 120 (100 base + 20 from amulet)
    expect(stateBefore.player.hp).toBe(95);

    // Use healing potion (heals 20 HP)
    useGameStore.getState().useItem(1); // slot 1 has healing potion

    const stateAfter = useGameStore.getState();
    // Should heal to 115 (95 + 20), which is above base maxHp but below effective maxHp
    expect(stateAfter.player.hp).toBe(115);
    expect(stateAfter.player.maxHp).toBe(100); // base maxHp unchanged
    expect(stateAfter.player.inventory[1]).toBeNull(); // potion consumed
  });

  it('clamps healing to effective maxHp when at high HP', () => {
    useGameStore.getState().startNewGame('heal-test-seed-2');

    const heartAmulet = getItemById('heart-amulet');
    const healingPotion = getItemById('healing-potion');

    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        hp: 110, // Already above base maxHp
        maxHp: 100,
        inventory: [heartAmulet, healingPotion, ...Array(23).fill(null)],
      },
    }));

    // Use healing potion
    useGameStore.getState().useItem(1);

    const stateAfter = useGameStore.getState();
    // Should clamp to effective maxHp of 120 (100 + 20)
    expect(stateAfter.player.hp).toBe(120);
  });
});
