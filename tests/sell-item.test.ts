import { describe, it, expect } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { getItemById } from '../src/data/itemLoader';

describe('Selling Items', () => {
  it('adds gold when selling an item', () => {
    useGameStore.getState().startNewGame('sell-test', false);
    
    const healingPotion = getItemById('healing-potion');
    expect(healingPotion).toBeTruthy();
    
    // Give player an item and some starting gold
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        gold: 50,
        inventory: [healingPotion, ...Array(24).fill(null)],
      },
    }));

    const stateBefore = useGameStore.getState();
    expect(stateBefore.player.gold).toBe(50);
    expect(stateBefore.player.inventory[0]).toEqual(healingPotion);

    // Sell the item
    useGameStore.getState().sellItem(0);

    const stateAfter = useGameStore.getState();
    // Gold should increase by sale value (healing potion sells for 10)
    expect(stateAfter.player.gold).toBe(60);
    // Item should be removed from inventory
    expect(stateAfter.player.inventory[0]).toBeNull();
  });

  it('sells items for their correct sale value', () => {
    useGameStore.getState().startNewGame('sell-test-2', false);
    
    const manaCrystal = getItemById('mana-crystal');
    expect(manaCrystal).toBeTruthy();
    expect(manaCrystal?.saleValue).toBe(100);
    
    // Give player the expensive item
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        gold: 0,
        inventory: [manaCrystal, ...Array(24).fill(null)],
      },
    }));

    expect(useGameStore.getState().player.gold).toBe(0);

    // Sell the mana crystal
    useGameStore.getState().sellItem(0);

    // Should receive 100 gold
    expect(useGameStore.getState().player.gold).toBe(100);
  });
});
