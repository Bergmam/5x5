import itemsData from '../data/items.json';
import type { InventoryItem } from '../game/types';

let itemsCache: InventoryItem[] | null = null;

export function loadItems(): InventoryItem[] {
  if (itemsCache) {
    return itemsCache;
  }
  
  itemsCache = itemsData.items as InventoryItem[];
  return itemsCache;
}

export function getItemById(id: string): InventoryItem | undefined {
  const items = loadItems();
  return items.find(item => item.id === id);
}

export function getRandomItem(rng: () => number): InventoryItem {
  const items = loadItems();
  const index = Math.floor(rng() * items.length);
  return items[index];
}

/**
 * Generates a shop inventory with guaranteed essential items:
 * - At least 1 healing potion
 * - At least 1 mana potion
 * - At least 1 weapon damage item
 * - At least 1 spell damage item
 * - Random items to fill remaining slots
 */
export function generateShopInventory(rng: () => number, totalSlots: number = 25): (InventoryItem | null)[] {
  const items = loadItems();
  const inventory: (InventoryItem | null)[] = [];
  
  // Guaranteed items
  const healingPotion = getItemById('healing-potion');
  const manaPotion = getItemById('mana-potion');
  const weaponDamageItem = getItemById('sharp-blade'); // Has weaponDamage stat
  const spellDamageItem = getItemById('mana-crystal'); // Has spellDamage stat
  
  // Add guaranteed items
  if (healingPotion) inventory.push(healingPotion);
  if (manaPotion) inventory.push(manaPotion);
  if (weaponDamageItem) inventory.push(weaponDamageItem);
  if (spellDamageItem) inventory.push(spellDamageItem);
  
  // Fill remaining slots with random items (3-5 additional items)
  const additionalItemCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < additionalItemCount && inventory.length < totalSlots; i++) {
    inventory.push(getRandomItem(rng));
  }
  
  // Fill rest with nulls
  while (inventory.length < totalSlots) {
    inventory.push(null);
  }
  
  return inventory;
}
