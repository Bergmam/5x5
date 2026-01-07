import type { Player } from '../../game/movement';
import type { InventoryItem } from '../../game/types';
import { useItem as applyItemUse, removeItem } from '../../game/inventory';
import { getAbilityBarFromInventory } from '../../game/abilities';
import { calculateEffectiveStats } from '../../game/stats';

export interface InventorySlice {
  // Inventory UI state
  inventoryOpen: boolean;
  selectedItemSlot: number | null;

  // Inventory actions
  toggleInventory: () => void;
  selectItem: (slotIndex: number | null) => void;
  useItem: (slotIndex: number) => void;
  destroyItem: (slotIndex: number) => void;
}

// Helper to clamp HP/MP to effective maximums
function clampResourcesToEffectiveMax(player: Player): Player {
  const effective = calculateEffectiveStats(
    {
      maxHp: player.maxHp,
      maxMp: player.maxMp,
      armor: player.armor,
      weaponDamage: player.weaponDamage,
      spellDamage: player.spellDamage,
    },
    player.inventory
  );
  return {
    ...player,
    hp: Math.min(player.hp, effective.maxHp),
    mp: Math.min(player.mp, effective.maxMp),
  };
}

export const createInventorySlice = (
  set: any,
  get: any
): InventorySlice => ({
  inventoryOpen: false,
  selectedItemSlot: null,

  toggleInventory: () => {
    set((state: any) => ({
      inventoryOpen: !state.inventoryOpen,
      selectedItemSlot: null, // Deselect when toggling
    }));
  },

  selectItem: (slotIndex: number | null) => {
    set({ selectedItemSlot: slotIndex });
  },

  useItem: (slotIndex: number) => {
    const state = get();
    const item = state.player.inventory[slotIndex];
    
    if (!item || item.kind !== 'consumable') {
      return;
    }

    const { player: updatedAfterUse, inventory: newInventory } = applyItemUse(state.player, slotIndex);
    // After consuming, inventory changes immediately (item removed). Clamp resources against
    // the post-consumption effective maxima.
    const clampedPlayer = clampResourcesToEffectiveMax({ ...updatedAfterUse, inventory: newInventory });

    set({
      player: clampedPlayer,
      selectedItemSlot: null,
      turnCount: state.turnCount + 1, // Using an item consumes a turn
      abilityBar: getAbilityBarFromInventory(clampedPlayer.inventory, 8),
    });

    // Enemies take their turn after item usage
    get()._runEnemyTurnAfterPlayerAction();
  },

  destroyItem: (slotIndex: number) => {
    const state = get();
    const item = state.player.inventory[slotIndex];
    
    if (!item) {
      return;
    }

    const newInventory = removeItem(state.player.inventory, slotIndex);

    const clamped = clampResourcesToEffectiveMax({
      ...state.player,
      inventory: newInventory,
    });

    set({
      player: clamped,
      selectedItemSlot: null,
      abilityBar: getAbilityBarFromInventory(clamped.inventory, 8),
    });
  },
});
