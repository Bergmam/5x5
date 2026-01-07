import { create } from 'zustand';
import { MapFloor, InventoryItem } from '../game/types';
import { Player, attemptMove, Direction, MoveResult } from '../game/movement';
import { generateFloor } from '../game/generator';
import { useItem as applyItemUse, removeItem } from '../game/inventory';
import { calculateEffectiveStats, type PlayerStats } from '../game/stats';
import { ABILITIES, getAbilityBarFromInventory, isDirectionalAbility, normalizeDirection, type AbilityId } from '../game/abilities';
import { generateShopInventory } from '../data/itemLoader';
import { createRng } from '../game/rng';
import { createShopSlice, type ShopSlice } from './slices/shopSlice';
import { createCombatSlice, type CombatSlice } from './slices/combatSlice';

interface GameState extends ShopSlice, CombatSlice {
  // Current game state
  player: Player;
  floor: MapFloor | null;
  turnCount: number;
  floorNumber: number;
  gameStarted: boolean;
  gameOver: boolean;
  victoryMessage: string | null;
  
  // Inventory UI state
  inventoryOpen: boolean;
  selectedItemSlot: number | null;

  // Abilities
  abilityBar: (AbilityId | null)[]; // 8 slots
  lastMoveDirection: Direction | null;
  
  // Animation state
  interaction: {
    type: 'attack' | 'bump' | 'enemy-aggro' | 'enemy-attack' | 'ability';
    targetPos: { x: number; y: number };
    timestamp: number;
    attackerId?: string;
    aggroEnemyIds?: string[];
    abilityId?: AbilityId;
  } | null;

  // Floating combat text (damage numbers, etc)
  combatText: Array<{
    id: string;
    kind: 'damage' | 'heal' | 'mp';
    amount: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
    icon: string;
    createdAt: number;
    ttlMs: number;
  }>;

  _enqueueCombatText: (events: GameState['combatText'][number] | Array<GameState['combatText'][number]>) => void;
  _removeCombatText: (id: string) => void;

  // Actions
  startNewGame: (seed?: string, useTemplates?: boolean) => void;
  movePlayer: (direction: Direction) => MoveResult;
  nextFloor: () => void;
  resetGame: () => void;
  toggleInventory: () => void;
  selectItem: (slotIndex: number | null) => void;
  useItem: (slotIndex: number) => void;
  destroyItem: (slotIndex: number) => void;
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

function clampResourcesToEffectiveMax(player: Player): Player {
  const effective = getEffectivePlayerStats(player);
  return {
    ...player,
    hp: Math.min(player.hp, effective.maxHp),
    mp: Math.min(player.mp, effective.maxMp),
  };
}

function makeCombatTextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Merge slices
  ...createShopSlice(set, get),
  ...createCombatSlice(set, get),
  
  player: createInitialPlayer(),
  floor: null,
  turnCount: 0,
  floorNumber: 1,
  gameStarted: false,
  gameOver: false,
  victoryMessage: null,
  inventoryOpen: false,
  selectedItemSlot: null,
  interaction: null,

  combatText: [],

  _removeCombatText: (id: string) => {
    set((s) => ({ combatText: s.combatText.filter((e) => e.id !== id) }));
  },

  _enqueueCombatText: (events) => {
    const batch = Array.isArray(events) ? events : [events];
    if (batch.length === 0) return;

    set((s) => {
      const next = [...s.combatText, ...batch];
      // cap to avoid unbounded growth if something goes wrong
      const capped = next.length > 30 ? next.slice(next.length - 30) : next;
      return { combatText: capped };
    });

    // Schedule expiry per event
    for (const e of batch) {
      setTimeout(() => {
        get()._removeCombatText(e.id);
      }, e.ttlMs);
    }
  },

  abilityBar: getAbilityBarFromInventory(createInitialPlayer().inventory, 8),
  lastMoveDirection: null,

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

  movePlayer: (direction: Direction): MoveResult => {
    const state = get();
    
    if (!state.floor || state.gameOver) {
      return { success: false, reason: 'game-not-active' };
    }

    const result = attemptMove(state.player, direction, state.floor);
    const normalizedDirection = normalizeDirection(direction);
    
    set({ lastMoveDirection: normalizedDirection });

    if (result.success && result.newPos) {
      // Prepare updates
      let updatedPlayer = { ...state.player, pos: result.newPos };
      let updatedFloor = state.floor;

      // Handle item pickup
      if (result.newInventory && result.itemEntityIdToRemove) {
        updatedPlayer.inventory = result.newInventory;
        updatedPlayer = clampResourcesToEffectiveMax(updatedPlayer);
        updatedFloor = {
          ...state.floor,
          entities: state.floor.entities.filter(e => e.id !== result.itemEntityIdToRemove)
        };
      }

      set((state) => ({
        player: updatedPlayer,
        floor: updatedFloor,
        turnCount: state.turnCount + 1,
        abilityBar: getAbilityBarFromInventory(updatedPlayer.inventory, 8),
      }));

      // Check if player moved away from shopkeeper (close shop if too far)
      if (state.shopOpen) {
        const shopkeeper = updatedFloor.entities.find(
          (e) => e.kind === 'npc' && (e.data as Record<string, unknown>)?.npcType === 'shopkeeper'
        );
        get()._closeShopIfTooFar(updatedPlayer.pos, shopkeeper?.pos || null);
      }

      // Check for exit - generate next floor
      if (result.triggeredExit) {
        get().nextFloor();
      }

      // Handle trap damage (placeholder - will be expanded with combat system)
      if (result.triggeredTrap) {
        const trapDamage = 10; // multiples of 5
        set((state) => ({
          player: {
            ...state.player,
            hp: Math.max(0, state.player.hp - trapDamage),
          },
        }));

        get()._triggerDeathIfNeeded();
      }

      // Run enemy turns after player movement
      get()._runEnemyTurnAfterPlayerAction();
    } else if (result.attackedEnemy) {
      // Check if it's an NPC interaction
      if (result.attackedEnemy.kind === 'npc') {
        const npcData = result.attackedEnemy.data as Record<string, unknown>;
        if (npcData?.npcType === 'shopkeeper') {
          // Open shop and populate with items
          const shopRng = createRng(`shop-${state.floor!.seed}`);
          const shopItems = generateShopInventory(shopRng);
          get()._openShop(shopItems);
        }
        // Don't advance turn or run enemy AI for NPC interaction
        return result;
      }

      // Handle attack on enemy - delegate to combat slice
      get()._handlePlayerAttackOnEnemy(result.attackedEnemy, state.player, state.floor);
    } else {
      // No movement occurred (blocked/out-of-bounds/etc). Treat as a turn so enemies can react.
      // This fixes cases where enemies only aggro after you successfully move adjacent.
      set((s) => ({ turnCount: s.turnCount + 1 }));
      get()._runEnemyTurnAfterPlayerAction();
    }

    return result;
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
      inventoryOpen: false,
      selectedItemSlot: null,
      abilityBar: getAbilityBarFromInventory(newPlayer.inventory, 8),
      lastMoveDirection: null,
    });
  },

  toggleInventory: () => {
    set((state) => ({
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
