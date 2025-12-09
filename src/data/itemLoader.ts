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
