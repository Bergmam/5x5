/**
 * Main Game Store
 * 
 * This is the central Zustand store for game state management. It uses a slice pattern
 * to organize different concerns into focused, manageable modules.
 * 
 * Slices:
 * - ShopSlice: Shop economy and transactions (src/store/slices/shopSlice.ts)
 * - CombatSlice: Combat mechanics and enemy AI (src/store/slices/combatSlice.ts)
 * - InventorySlice: Inventory management (src/store/slices/inventorySlice.ts)
 * - MovementSlice: Player movement and interactions (src/store/slices/movementSlice.ts)
 * - VisualEffectsSlice: Animations and combat text (src/store/slices/visualEffectsSlice.ts)
 * 
 * For detailed documentation on the slice architecture and how to create new slices,
 * see: docs/14-state-architecture.md
 */

import { create } from 'zustand';
import { MapFloor, InventoryItem } from '../game/types';
import { Player, Direction, MoveResult } from '../game/movement';
import { generateFloor } from '../game/generator';
import { calculateEffectiveStats, type PlayerStats } from '../game/stats';
import { ABILITIES, getAbilityBarFromInventory, isDirectionalAbility, normalizeDirection, type AbilityId } from '../game/abilities';
import { generateShopInventory } from '../data/itemLoader';
import { createRng } from '../game/rng';
import { createShopSlice, type ShopSlice } from './slices/shopSlice';
import { createCombatSlice, type CombatSlice } from './slices/combatSlice';
import { createInventorySlice, type InventorySlice } from './slices/inventorySlice';
import { createMovementSlice, type MovementSlice } from './slices/movementSlice';
import { createVisualEffectsSlice, type VisualEffectsSlice, makeCombatTextId } from './slices/visualEffectsSlice';

export interface GameState extends ShopSlice, CombatSlice, InventorySlice, MovementSlice, VisualEffectsSlice {
  // Current game state
  player: Player;
  floor: MapFloor | null;
  turnCount: number;
  floorNumber: number;
  gameStarted: boolean;
  gameOver: boolean;
  victoryMessage: string | null;
  

  // Abilities
  abilityBar: (AbilityId | null)[]; // 8 slots

  // Actions
  startNewGame: (seed?: string, useTemplates?: boolean) => void;
  nextFloor: () => void;
  resetGame: () => void;
  castAbility: (slotIndex: number) => void;
}

const createInitialPlayer = (): Player => ({
  pos: { x: 0, y: 0 },
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  weaponDamage: 15,
  spellDamage: 20,
  armor: 5,
  gold: 0,
  inventory: Array(25).fill(null),
});

function getEffectivePlayerStats(player: Player): PlayerStats {
  return calculateEffectiveStats(
    {
      maxHp: player.maxHp,
      maxMp: player.maxMp,
      armor: player.armor,
      weaponDamage: player.weaponDamage,
      spellDamage: player.spellDamage,
    },
    player.inventory
  );
}

export const useGameStore = create<GameState>((set, get) => ({
  // Merge slices
  ...createShopSlice(set, get),
  ...createCombatSlice(set, get),
  ...createInventorySlice(set, get),
  ...createMovementSlice(set, get),
  ...createVisualEffectsSlice(set, get),
  
  player: createInitialPlayer(),
  floor: null,
  turnCount: 0,
  floorNumber: 1,
  gameStarted: false,
  gameOver: false,
  victoryMessage: null,

  abilityBar: getAbilityBarFromInventory(createInitialPlayer().inventory, 8),

  startNewGame: (seed?: string, useTemplates = true) => {
    const floorSeed = seed || `floor-1-${Date.now()}`;
    const newFloor = generateFloor(floorSeed, {
      width: 5,
      height: 5,
      wallDensity: 0.5, // Increased density for dungeon feel
      enemyBudget: 3,
      chestBudget: 2,
      minPathLength: 5,
      floorNumber: 1,
      useTemplate: useTemplates, // Allow templates in normal gameplay
    });

    const newPlayer = createInitialPlayer();
    newPlayer.pos = { ...newFloor.entrance };

    set({
      player: newPlayer,
      floor: newFloor,
      turnCount: 0,
      floorNumber: 1,
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      abilityBar: getAbilityBarFromInventory(newPlayer.inventory, 8),
      lastMoveDirection: null,
    });
  },

  nextFloor: () => {
    const state = get();
    const nextFloorNum = state.floorNumber + 1;
    const floorSeed = `floor-${nextFloorNum}-${Date.now()}`;
    
    // Use current exit as new entrance if available
    const newEntrance = state.floor ? state.floor.exit : undefined;

    const newFloor = generateFloor(floorSeed, {
      width: 5,
      height: 5,
      wallDensity: 0.5, // Increased density for dungeon feel
      enemyBudget: 3 + Math.floor(nextFloorNum / 2), // Scale difficulty
      chestBudget: 2,
      minPathLength: 5,
      entrance: newEntrance,
      floorNumber: nextFloorNum,
      useTemplate: true, // Allow templates in normal gameplay
    });

    // Keep player stats but reset position to new entrance
    const updatedPlayer = { ...state.player };
    updatedPlayer.pos = { ...newFloor.entrance };

    // Relic effects on floor climb
    // Vitality Charm: regain 5 HP for every floor you climb (stacks by count).
    const vitalityCharmCount = updatedPlayer.inventory.filter((i) => i?.id === 'vitality-charm').length;
    if (vitalityCharmCount > 0) {
      const heal = 5 * vitalityCharmCount;
      const effective = getEffectivePlayerStats(updatedPlayer);
      updatedPlayer.hp = Math.min(effective.maxHp, updatedPlayer.hp + heal);
    }

    set({
      player: updatedPlayer,
      floor: newFloor,
      floorNumber: nextFloorNum,
    });
  },

  resetGame: () => {
    const newPlayer = createInitialPlayer();
    set({
      player: newPlayer,
      floor: null,
      turnCount: 0,
      floorNumber: 1,
      gameStarted: false,
      gameOver: false,
      victoryMessage: null,
      abilityBar: getAbilityBarFromInventory(newPlayer.inventory, 8),
      lastMoveDirection: null,
    });
  },

  castAbility: (slotIndex: number) => {
    const state = get();
    if (!state.floor || state.gameOver) return;
    if (slotIndex < 0 || slotIndex >= state.abilityBar.length) return;

    const abilityId = state.abilityBar[slotIndex];
    if (!abilityId) return;

    if (isDirectionalAbility(abilityId) && !state.lastMoveDirection) {
      return;
    }

    const effective = getEffectivePlayerStats(state.player);
    const def = ABILITIES[abilityId];

    const mpCost = def.mpCost ?? 0;
    if (mpCost > 0 && state.player.mp < mpCost) {
      return;
    }

    const result = def.execute({
      floor: state.floor,
      playerPos: state.player.pos,
      facing: state.lastMoveDirection,
      effectiveStats: effective,
    });

    if (!result.didCast) return;

    // Floaters for ability hits.
    if (result.hitEnemyIds && result.hitEnemyIds.length > 0) {
      const from = { ...state.player.pos };
      const icon = def.icon;
      const now = Date.now();
      const events: GameState['combatText'] = [];

      for (const enemyId of result.hitEnemyIds) {
        const targetEntity = state.floor.entities.find((e) => e.id === enemyId);
        if (!targetEntity) continue;
        const amount = result.damageByEnemyId?.[enemyId] ?? 0;
        events.push({
          id: makeCombatTextId('ability-dmg'),
          kind: 'damage',
          amount,
          from,
          to: { ...targetEntity.pos },
          icon,
          createdAt: now,
          ttlMs: 650,
        });
      }

      if (events.length > 0) {
        get()._enqueueCombatText(events);
      }
    }

    set((s) => ({
      floor: s.floor
        ? {
            ...s.floor,
            entities: result.entities,
          }
        : s.floor,
      interaction: result.interaction || s.interaction,
      player: {
        ...s.player,
        mp: Math.max(0, s.player.mp - mpCost),
      },
      turnCount: s.turnCount + 1,
    }));

    // Casting an ability consumes the player's turn.
    get()._runEnemyTurnAfterPlayerAction();
  },
}));
