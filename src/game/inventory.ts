import type { InventoryItem, Player } from './types';

export interface PlayerStats {
  maxHp: number;
  maxMp: number;
  armor: number;
  weaponDamage: number;
  spellDamage: number;
}

export function calculateStats(
  baseStats: PlayerStats,
  inventory: (InventoryItem | null)[]
): PlayerStats {
  const bonuses = inventory.reduce(
    (acc, item) => {
      if (item?.stats) {
        acc.hpBonus += item.stats.hpBonus || 0;
        acc.mpBonus += item.stats.mpBonus || 0;
        acc.armorBonus += item.stats.armorBonus || 0;
        acc.weaponDamageBonus += item.stats.weaponDamageBonus || 0;
        acc.spellDamageBonus += item.stats.spellDamageBonus || 0;
      }
      return acc;
    },
    {
      hpBonus: 0,
      mpBonus: 0,
      armorBonus: 0,
      weaponDamageBonus: 0,
      spellDamageBonus: 0,
    }
  );

  return {
    maxHp: baseStats.maxHp + bonuses.hpBonus,
    maxMp: baseStats.maxMp + bonuses.mpBonus,
    armor: baseStats.armor + bonuses.armorBonus,
    weaponDamage: baseStats.weaponDamage + bonuses.weaponDamageBonus,
    spellDamage: baseStats.spellDamage + bonuses.spellDamageBonus,
  };
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
  
  // Apply consumable effects
  if (item.consumable.healHp) {
    newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + item.consumable.healHp);
  }
  
  if (item.consumable.restoreMp) {
    newPlayer.mp = Math.min(newPlayer.maxMp, newPlayer.mp + item.consumable.restoreMp);
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
