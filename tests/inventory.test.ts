import { describe, it, expect, beforeEach } from 'vitest';
import {
  addItem,
  removeItem,
  useItem,
  calculateStats,
  getInventoryCount,
  type PlayerStats,
} from '../src/game/inventory';
import type { InventoryItem, Player } from '../src/game/types';

describe('Inventory System', () => {
  let emptyInventory: (InventoryItem | null)[];
  let testPlayer: Player;
  let baseStats: PlayerStats;

  const healingPotion: InventoryItem = {
    id: 'healing-potion',
    name: 'Healing Potion',
    description: 'Restores 20 HP',
    icon: '🧪',
    rarity: 'common',
    kind: 'consumable',
    consumable: {
      healHp: 20,
    },
  };

  const ironPlate: InventoryItem = {
    id: 'iron-plate',
    name: 'Iron Plate',
    description: 'A sturdy piece of metal',
    icon: '🛡️',
    rarity: 'uncommon',
    kind: 'passive',
    stats: {
      armor: 5,
    },
  };

  const sharpBlade: InventoryItem = {
    id: 'sharp-blade',
    name: 'Sharp Blade',
    description: 'A well-honed weapon',
    icon: '⚔️',
    rarity: 'rare',
    kind: 'passive',
    stats: {
      weaponDamage: 10,
    },
  };

  const manaCrystal: InventoryItem = {
    id: 'mana-crystal',
    name: 'Mana Crystal',
    description: 'Pulsing with arcane energy',
    icon: '💎',
    rarity: 'epic',
    kind: 'passive',
    stats: {
      maxMp: 15,
      spellDamage: 5,
    },
  };

  const manaPotion: InventoryItem = {
    id: 'mana-potion',
    name: 'Mana Potion',
    description: 'Restores 30 MP',
    icon: '🔮',
    rarity: 'common',
    kind: 'consumable',
    consumable: {
      restoreMp: 30,
    },
  };

  beforeEach(() => {
    emptyInventory = Array(25).fill(null);
    baseStats = {
      maxHp: 100,
      maxMp: 50,
      armor: 0,
      weaponDamage: 10,
      spellDamage: 5,
    };
    testPlayer = {
      hp: 50,
      maxHp: 100,
      mp: 20,
      maxMp: 50,
      armor: 0,
      weaponDamage: 10,
      spellDamage: 5,
      pos: { x: 0, y: 0 },
      inventory: Array(25).fill(null),
    };
  });

  describe('addItem', () => {
    it('adds item to first empty slot', () => {
      const result = addItem(emptyInventory, healingPotion);
      expect(result).not.toBeNull();
      if (result) {
        expect(result[0]).toEqual(healingPotion);
        expect(result[1]).toBeNull();
      }
    });

    it('adds item to next available slot', () => {
      let inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, ironPlate);
        expect(inventory).not.toBeNull();
        if (inventory) {
          expect(inventory[0]).toEqual(healingPotion);
          expect(inventory[1]).toEqual(ironPlate);
          expect(inventory[2]).toBeNull();
        }
      }
    });

    it('returns null if full', () => {
      const fullInventory = Array(25).fill(healingPotion) as InventoryItem[];
      const result = addItem(fullInventory, ironPlate);
      expect(result).toBeNull();
    });

    it('fills all 25 slots correctly', () => {
      let inventory: (InventoryItem | null)[] = emptyInventory;
      for (let i = 0; i < 25; i++) {
        const temp = addItem(inventory, healingPotion);
        expect(temp).not.toBeNull();
        if (temp) inventory = temp;
      }
      expect(inventory.every(item => item !== null)).toBe(true);
      expect(getInventoryCount(inventory)).toBe(25);
    });

    it('handles adding to partially filled inventory', () => {
      const inventory = [...emptyInventory];
      inventory[0] = healingPotion;
      inventory[5] = ironPlate;
      inventory[10] = sharpBlade;
      
      const result = addItem(inventory, manaCrystal);
      expect(result).not.toBeNull();
      if (result) {
        expect(result[0]).toEqual(healingPotion);
        expect(result[1]).toEqual(manaCrystal); // First available slot
        expect(result[5]).toEqual(ironPlate);
        expect(result[10]).toEqual(sharpBlade);
      }
    });
  });

  describe('removeItem', () => {
    it('removes item from specified slot', () => {
      const inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        const result = removeItem(inventory, 0);
        expect(result[0]).toBeNull();
      }
    });

    it('removes item from middle slot', () => {
      let inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, ironPlate);
        expect(inventory).not.toBeNull();
        if (inventory) {
          inventory = addItem(inventory, sharpBlade);
          expect(inventory).not.toBeNull();
          if (inventory) {
            const result = removeItem(inventory, 1);
            expect(result[0]).toEqual(healingPotion);
            expect(result[1]).toBeNull();
            expect(result[2]).toEqual(sharpBlade);
          }
        }
      }
    });

    it('handles removing from empty slot', () => {
      const result = removeItem(emptyInventory, 0);
      expect(result[0]).toBeNull();
    });

    it('handles invalid slot index', () => {
      const inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        const result = removeItem(inventory, 30);
        expect(result).toEqual(inventory);
      }
    });
  });

  describe('useItem', () => {
    it('heals player with healing potion', () => {
      const inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        testPlayer.inventory = inventory;
        testPlayer.hp = 50;

        const result = useItem(testPlayer, 0);
        expect(result.player.hp).toBe(70);
        expect(result.inventory[0]).toBeNull();
      }
    });

    it('restores MP with mana potion', () => {
      const inventory = addItem(emptyInventory, manaPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        testPlayer.inventory = inventory;
        testPlayer.mp = 10;

        const result = useItem(testPlayer, 0);
        expect(result.player.mp).toBe(40);
        expect(result.inventory[0]).toBeNull();
      }
    });

    it('applies healing without clamping (clamping happens at store level)', () => {
      const inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        testPlayer.inventory = inventory;
        testPlayer.hp = 95; // Only 5 HP missing

        const result = useItem(testPlayer, 0);
        // useItem no longer clamps - it adds the full heal amount
        expect(result.player.hp).toBe(115); // 95 + 20
        expect(result.player.maxHp).toBe(100);
      }
    });

    it('applies MP restore without clamping (clamping happens at store level)', () => {
      const inventory = addItem(emptyInventory, manaPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        testPlayer.inventory = inventory;
        testPlayer.mp = 40; // Only 10 MP missing

        const result = useItem(testPlayer, 0);
        // useItem no longer clamps - it adds the full restore amount
        expect(result.player.mp).toBe(70); // 40 + 30
        expect(result.player.maxMp).toBe(50);
      }
    });

    it('does not use passive items', () => {
      const inventory = addItem(emptyInventory, ironPlate);
      expect(inventory).not.toBeNull();
      if (inventory) {
        testPlayer.inventory = inventory;

        const result = useItem(testPlayer, 0);
        expect(result.inventory[0]).toEqual(ironPlate);
        expect(result.player.hp).toBe(50); // No change
      }
    });

    it('does not use empty slot', () => {
      const result = useItem(testPlayer, 0);
      expect(result.player).toEqual(testPlayer);
      expect(result.inventory).toEqual(testPlayer.inventory);
    });

    it('heals even when already at full HP (clamping happens at store level)', () => {
      const inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        testPlayer.inventory = inventory;
        testPlayer.hp = 100;

        const result = useItem(testPlayer, 0);
        // useItem adds the heal amount, store will clamp it
        expect(result.player.hp).toBe(120); // 100 + 20
        expect(result.inventory[0]).toBeNull();
      }
    });
  });

  describe('calculateStats', () => {
    it('returns base stats for empty inventory', () => {
      const stats = calculateStats(baseStats, emptyInventory);
      expect(stats.maxHp).toBe(100);
      expect(stats.maxMp).toBe(50);
      expect(stats.armor).toBe(0);
      expect(stats.weaponDamage).toBe(10);
      expect(stats.spellDamage).toBe(5);
    });

    it('calculates single item bonuses', () => {
      const inventory = addItem(emptyInventory, ironPlate);
      expect(inventory).not.toBeNull();
      if (inventory) {
        const stats = calculateStats(baseStats, inventory);
        expect(stats.armor).toBe(5);
        expect(stats.maxHp).toBe(100);
      }
    });

    it('sums multiple item bonuses', () => {
      let inventory = addItem(emptyInventory, ironPlate);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, sharpBlade);
        expect(inventory).not.toBeNull();
        if (inventory) {
          inventory = addItem(inventory, manaCrystal);
          expect(inventory).not.toBeNull();
          if (inventory) {
            const stats = calculateStats(baseStats, inventory);
            expect(stats.armor).toBe(5);
            expect(stats.weaponDamage).toBe(20);
            expect(stats.maxMp).toBe(65);
            expect(stats.spellDamage).toBe(10);
            expect(stats.maxHp).toBe(100);
          }
        }
      }
    });

    it('ignores consumable items in stat calculation', () => {
      let inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, manaPotion);
        expect(inventory).not.toBeNull();
        if (inventory) {
          inventory = addItem(inventory, ironPlate);
          expect(inventory).not.toBeNull();
          if (inventory) {
            const stats = calculateStats(baseStats, inventory);
            expect(stats.armor).toBe(5);
            expect(stats.maxHp).toBe(100); // Consumables don't grant passive bonuses
          }
        }
      }
    });

    it('calculates stats with duplicate items', () => {
      let inventory = addItem(emptyInventory, ironPlate);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, ironPlate);
        expect(inventory).not.toBeNull();
        if (inventory) {
          inventory = addItem(inventory, ironPlate);
          expect(inventory).not.toBeNull();
          if (inventory) {
            const stats = calculateStats(baseStats, inventory);
            expect(stats.armor).toBe(15);
          }
        }
      }
    });

    it('handles items with multiple stat bonuses', () => {
      const inventory = addItem(emptyInventory, manaCrystal);
      expect(inventory).not.toBeNull();
      if (inventory) {
        const stats = calculateStats(baseStats, inventory);
        expect(stats.maxMp).toBe(65);
        expect(stats.spellDamage).toBe(10);
      }
    });
  });

  describe('getInventoryCount', () => {
    it('returns 0 for empty inventory', () => {
      expect(getInventoryCount(emptyInventory)).toBe(0);
    });

    it('returns correct count for single item', () => {
      const inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        expect(getInventoryCount(inventory)).toBe(1);
      }
    });

    it('returns correct count for multiple items', () => {
      let inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, ironPlate);
        expect(inventory).not.toBeNull();
        if (inventory) {
          inventory = addItem(inventory, sharpBlade);
          expect(inventory).not.toBeNull();
          if (inventory) {
            expect(getInventoryCount(inventory)).toBe(3);
          }
        }
      }
    });

    it('returns 25 for full inventory', () => {
      const fullInventory = Array(25).fill(healingPotion) as InventoryItem[];
      expect(getInventoryCount(fullInventory)).toBe(25);
    });

    it('handles inventory with gaps', () => {
      const inventory = [...emptyInventory];
      inventory[0] = healingPotion;
      inventory[5] = ironPlate;
      inventory[24] = sharpBlade;
      expect(getInventoryCount(inventory)).toBe(3);
    });
  });

  describe('Inventory edge cases', () => {
    it('maintains inventory integrity after multiple operations', () => {
      let inventory = addItem(emptyInventory, healingPotion);
      expect(inventory).not.toBeNull();
      if (inventory) {
        inventory = addItem(inventory, ironPlate);
        expect(inventory).not.toBeNull();
        if (inventory) {
          inventory = addItem(inventory, sharpBlade);
          expect(inventory).not.toBeNull();
          if (inventory) {
            // Remove middle item
            inventory = removeItem(inventory, 1);
            
            // Add another item (should go to slot 1)
            inventory = addItem(inventory, manaCrystal);
            expect(inventory).not.toBeNull();
            if (inventory) {
              expect(inventory[0]).toEqual(healingPotion);
              expect(inventory[1]).toEqual(manaCrystal);
              expect(inventory[2]).toEqual(sharpBlade);
              expect(getInventoryCount(inventory)).toBe(3);
            }
          }
        }
      }
    });

    it('handles rapid add/remove operations', () => {
      let inventory: (InventoryItem | null)[] = emptyInventory;
      
      for (let i = 0; i < 10; i++) {
        const temp1 = addItem(inventory, healingPotion);
        expect(temp1).not.toBeNull();
        if (temp1) {
          const temp2 = addItem(temp1, ironPlate);
          expect(temp2).not.toBeNull();
          if (temp2) {
            inventory = removeItem(temp2, 0);
          }
        }
      }
      
      expect(getInventoryCount(inventory)).toBe(10);
    });

    it('preserves item properties after inventory operations', () => {
      const inventory = addItem(emptyInventory, manaCrystal);
      expect(inventory).not.toBeNull();
      if (inventory) {
        const retrievedItem = inventory[0];
        
        expect(retrievedItem).toEqual(manaCrystal);
        expect(retrievedItem?.id).toBe('mana-crystal');
        expect(retrievedItem?.rarity).toBe('epic');
        expect(retrievedItem?.stats?.maxMp).toBe(15);
        expect(retrievedItem?.stats?.spellDamage).toBe(5);
      }
    });

    it('handles null inventory slot operations', () => {
      const inventory = [...emptyInventory];
      inventory[0] = healingPotion;
      
      // Try to use an empty slot
      testPlayer.inventory = inventory;
      const result = useItem(testPlayer, 1);
      expect(result.inventory[1]).toBeNull();
      expect(result.player.hp).toBe(testPlayer.hp);
    });
  });
});
