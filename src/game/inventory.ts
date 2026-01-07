import type { InventoryItem, Player } from './types';
import type { PlayerStats } from './stats';
import { calculateEffectiveStats } from './stats';

// Re-export for backward compatibility with existing imports/tests.
export type { PlayerStats } from './stats';

export function calculateStats(
  baseStats: PlayerStats,
  inventory: (InventoryItem | null)[]
): PlayerStats {
  return calculateEffectiveStats(baseStats, inventory);
}

export function getFirstEmptySlot(
  inventory: (InventoryItem | null)[]
): number | null {
  for (let i = 0; i < 25; i++) {
    if (!inventory[i]) return i;
  }
  return null;
}

export function addItem(
  inventory: (InventoryItem | null)[],
  item: InventoryItem
): (InventoryItem | null)[] | null {
  const emptySlot = getFirstEmptySlot(inventory);
  if (emptySlot === null) return null;

  const newInventory = [...inventory];
  newInventory[emptySlot] = item;
  return newInventory;
}

export function removeItem(
  inventory: (InventoryItem | null)[],
  slotIndex: number
): (InventoryItem | null)[] {
  if (slotIndex < 0 || slotIndex >= 25) {
    return inventory;
  }

  const newInventory = [...inventory];
  newInventory[slotIndex] = null;
  return newInventory;
}

export function useItem(
  player: Player,
  slotIndex: number
): { player: Player; inventory: (InventoryItem | null)[] } {
  const item = player.inventory[slotIndex];
  
  if (!item || !item.consumable) {
    return { player, inventory: player.inventory };
  }

  const newPlayer = { ...player };
  
  // Apply consumable effects - don't clamp here, let the caller handle clamping to effective max
  if (item.consumable.healHp) {
    newPlayer.hp = newPlayer.hp + item.consumable.healHp;
  }
  
  if (item.consumable.restoreMp) {
    newPlayer.mp = newPlayer.mp + item.consumable.restoreMp;
  }

  // Remove item from inventory
  const newInventory = removeItem(player.inventory, slotIndex);

  return { player: newPlayer, inventory: newInventory };
}

export function getItemAt(
  inventory: (InventoryItem | null)[],
  slotIndex: number
): InventoryItem | null {
  if (slotIndex < 0 || slotIndex >= 25) {
    return null;
  }
  return inventory[slotIndex];
}

export function getInventoryCount(inventory: (InventoryItem | null)[]): number {
  return inventory.filter(item => item !== null).length;
}
