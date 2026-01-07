import type { InventoryItem } from '../../game/types';
import { removeItem } from '../../game/inventory';
import { getAbilityBarFromInventory } from '../../game/abilities';

export interface ShopSlice {
  // Shop UI state
  shopOpen: boolean;
  shopInventory: (InventoryItem | null)[];
  selectedShopSlot: number | null;

  // Shop actions
  toggleShop: () => void;
  selectShopItem: (slotIndex: number | null) => void;
  buyShopItem: (slotIndex: number) => void;
  sellItem: (slotIndex: number) => void;
  
  // Internal action to open shop with inventory
  _openShop: (inventory: (InventoryItem | null)[]) => void;
  // Internal action to close shop when moving away
  _closeShopIfTooFar: (playerPos: { x: number; y: number }, shopkeeperPos: { x: number; y: number } | null) => void;
}

export const createShopSlice = (
  set: any,
  get: any
): ShopSlice => ({
  shopOpen: false,
  shopInventory: Array(25).fill(null),
  selectedShopSlot: null,

  toggleShop: () => {
    set((s: any) => ({ 
      shopOpen: !s.shopOpen,
      // Close inventory when shop closes
      inventoryOpen: s.shopOpen ? false : s.inventoryOpen,
    }));
  },

  selectShopItem: (slotIndex: number | null) => {
    set({ selectedShopSlot: slotIndex });
  },

  buyShopItem: (slotIndex: number) => {
    const state = get();
    const item = state.shopInventory[slotIndex];
    
    if (!item) {
      return; // No item in this slot
    }

    // Check if player has enough gold
    if (state.player.gold < item.saleValue) {
      console.log('Not enough gold!');
      return;
    }

    // Check if player has inventory space
    const emptySlot = state.player.inventory.findIndex((slot: any) => slot === null);
    if (emptySlot === -1) {
      console.log('Inventory full!');
      return;
    }

    // Perform the purchase
    const newInventory = [...state.player.inventory];
    newInventory[emptySlot] = item;

    // Remove item from shop
    const newShopInventory = [...state.shopInventory];
    newShopInventory[slotIndex] = null;

    set({
      player: {
        ...state.player,
        gold: state.player.gold - item.saleValue,
        inventory: newInventory,
      },
      shopInventory: newShopInventory,
      selectedShopSlot: null,
      abilityBar: getAbilityBarFromInventory(newInventory, 8),
    });
  },

  sellItem: (slotIndex: number) => {
    const state = get();
    const item = state.player.inventory[slotIndex];
    
    if (!item) {
      return;
    }

    // Add gold to player
    const goldToAdd = item.saleValue || 0;
    const newInventory = removeItem(state.player.inventory, slotIndex);

    // We need access to getEffectivePlayerStats - import from parent store
    const clamped = {
      ...state.player,
      inventory: newInventory,
      gold: state.player.gold + goldToAdd,
    };

    set({
      player: clamped,
      selectedItemSlot: null,
      abilityBar: getAbilityBarFromInventory(clamped.inventory, 8),
    });
  },

  _openShop: (inventory: (InventoryItem | null)[]) => {
    set({
      shopOpen: true,
      shopInventory: inventory,
      inventoryOpen: true, // Also open inventory for selling
    });
  },

  _closeShopIfTooFar: (playerPos: { x: number; y: number }, shopkeeperPos: { x: number; y: number } | null) => {
    const state = get();
    if (!state.shopOpen || !shopkeeperPos) return;

    const distance = Math.abs(playerPos.x - shopkeeperPos.x) + Math.abs(playerPos.y - shopkeeperPos.y);
    // Close shop if player is more than 1 tile away (adjacent tiles are distance 1)
    if (distance > 1) {
      set({
        shopOpen: false,
        inventoryOpen: false,
        selectedShopSlot: null,
      });
    }
  },
});
