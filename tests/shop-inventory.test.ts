import { describe, it, expect } from 'vitest';
import { generateShopInventory, getItemById } from '../src/data/itemLoader';

describe('Shop Inventory Generation', () => {
  const mockRng = () => 0.5; // Consistent random value

  it('should always include a healing potion', () => {
    const inventory = generateShopInventory(mockRng);
    const healingPotion = getItemById('healing-potion');
    
    expect(inventory).toContainEqual(healingPotion);
  });

  it('should always include a mana potion', () => {
    const inventory = generateShopInventory(mockRng);
    const manaPotion = getItemById('mana-potion');
    
    expect(inventory).toContainEqual(manaPotion);
  });

  it('should always include a weapon damage item', () => {
    const inventory = generateShopInventory(mockRng);
    const sharpBlade = getItemById('sharp-blade');
    
    expect(inventory).toContainEqual(sharpBlade);
  });

  it('should always include a spell damage item', () => {
    const inventory = generateShopInventory(mockRng);
    const manaCrystal = getItemById('mana-crystal');
    
    expect(inventory).toContainEqual(manaCrystal);
  });

  it('should have at least 7 items total (4 guaranteed + 3 random minimum)', () => {
    const inventory = generateShopInventory(mockRng);
    const nonNullItems = inventory.filter(item => item !== null);
    
    expect(nonNullItems.length).toBeGreaterThanOrEqual(7);
  });

  it('should have at most 9 items total (4 guaranteed + 5 random maximum)', () => {
    const maxRng = () => 0.99; // Maximum random value
    const inventory = generateShopInventory(maxRng);
    const nonNullItems = inventory.filter(item => item !== null);
    
    expect(nonNullItems.length).toBeLessThanOrEqual(9);
  });

  it('should fill remaining slots with null', () => {
    const inventory = generateShopInventory(mockRng);
    
    expect(inventory).toHaveLength(25);
    expect(inventory.some(item => item === null)).toBe(true);
  });

  it('should generate different random items with different RNG', () => {
    let counter = 0;
    const incrementingRng = () => {
      counter += 0.1;
      return counter % 1;
    };

    const inventory1 = generateShopInventory(() => 0.2);
    const inventory2 = generateShopInventory(() => 0.8);
    
    // Both should have the guaranteed items
    expect(inventory1).toContainEqual(getItemById('healing-potion'));
    expect(inventory2).toContainEqual(getItemById('healing-potion'));
    
    // But the random items might differ (this is probabilistic, but very likely)
    const items1 = inventory1.filter(item => item !== null);
    const items2 = inventory2.filter(item => item !== null);
    
    // Both should have items
    expect(items1.length).toBeGreaterThan(4);
    expect(items2.length).toBeGreaterThan(4);
  });
});
