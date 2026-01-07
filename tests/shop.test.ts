import { describe, it, expect } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { getItemById } from '../src/data/itemLoader';

describe('Shop System', () => {
  it('starts with shop closed', () => {
    useGameStore.getState().startNewGame('shop-test-seed');
    
    const state = useGameStore.getState();
    expect(state.shopOpen).toBe(false);
    expect(state.shopInventory).toHaveLength(25);
  });

  it('can toggle shop open and closed', () => {
    useGameStore.getState().startNewGame('shop-test-seed-2');
    
    expect(useGameStore.getState().shopOpen).toBe(false);
    
    useGameStore.getState().toggleShop();
    expect(useGameStore.getState().shopOpen).toBe(true);
    
    useGameStore.getState().toggleShop();
    expect(useGameStore.getState().shopOpen).toBe(false);
  });

  it('allows purchasing an item with enough gold', () => {
    useGameStore.getState().startNewGame('shop-test-seed-3');
    
    const healingPotion = getItemById('healing-potion');
    expect(healingPotion).toBeTruthy();
    
    // Set up shop with a healing potion and give player gold
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        gold: 50,
      },
      shopInventory: [healingPotion, ...Array(24).fill(null)],
    }));

    const stateBefore = useGameStore.getState();
    expect(stateBefore.player.gold).toBe(50);
    expect(stateBefore.player.inventory[0]).toBeNull();

    // Buy the item
    useGameStore.getState().buyShopItem(0);

    const stateAfter = useGameStore.getState();
    // Gold should be deducted (healing potion costs 10)
    expect(stateAfter.player.gold).toBe(40);
    // Item should be in inventory
    expect(stateAfter.player.inventory[0]).toEqual(healingPotion);
    // Item should be removed from shop
    expect(stateAfter.shopInventory[0]).toBeNull();
  });

  it('prevents purchasing without enough gold', () => {
    useGameStore.getState().startNewGame('shop-test-seed-4');
    
    const healingPotion = getItemById('healing-potion');
    
    // Set up shop with item but player has insufficient gold
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        gold: 5, // Not enough for healing potion (costs 10)
      },
      shopInventory: [healingPotion, ...Array(24).fill(null)],
    }));

    const stateBefore = useGameStore.getState();
    expect(stateBefore.player.gold).toBe(5);

    // Try to buy the item
    useGameStore.getState().buyShopItem(0);

    const stateAfter = useGameStore.getState();
    // Gold should not change
    expect(stateAfter.player.gold).toBe(5);
    // Item should still be in inventory slot 0 (not purchased)
    expect(stateAfter.player.inventory[0]).toBeNull();
    // Item should still be in shop
    expect(stateAfter.shopInventory[0]).toEqual(healingPotion);
  });

  it('prevents purchasing when inventory is full', () => {
    useGameStore.getState().startNewGame('shop-test-seed-5');
    
    const healingPotion = getItemById('healing-potion');
    const ironPlate = getItemById('iron-plate');
    
    // Fill inventory completely
    const fullInventory = Array(25).fill(ironPlate);
    
    useGameStore.setState((s) => ({
      player: {
        ...s.player,
        gold: 50,
        inventory: fullInventory,
      },
      shopInventory: [healingPotion, ...Array(24).fill(null)],
    }));

    const stateBefore = useGameStore.getState();
    expect(stateBefore.player.gold).toBe(50);

    // Try to buy the item
    useGameStore.getState().buyShopItem(0);

    const stateAfter = useGameStore.getState();
    // Gold should not change (purchase failed)
    expect(stateAfter.player.gold).toBe(50);
    // Item should still be in shop
    expect(stateAfter.shopInventory[0]).toEqual(healingPotion);
  });
});
