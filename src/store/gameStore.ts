import { create } from 'zustand';
import { MapFloor, InventoryItem, EnemyData } from '../game/types';
import { Player, attemptMove, Direction, MoveResult } from '../game/movement';
import { generateFloor } from '../game/generator';
import { useItem as applyItemUse, removeItem, getInventoryCount } from '../game/inventory';
import { runEnemyTurn as runEnemyTurnModule } from '../game/enemyAI';

interface GameState {
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
  
  // Animation state
  interaction: {
    type: 'attack' | 'bump' | 'enemy-aggro' | 'enemy-attack';
    targetPos: { x: number; y: number };
    timestamp: number;
    attackerId?: string;
    aggroEnemyIds?: string[];
  } | null;

  // Internal helper so non-movement actions (like items) can advance enemies too.
  _runEnemyTurnAfterPlayerAction: () => void;

  // Actions
  startNewGame: (seed?: string) => void;
  movePlayer: (direction: Direction) => MoveResult;
  nextFloor: () => void;
  resetGame: () => void;
  toggleInventory: () => void;
  selectItem: (slotIndex: number | null) => void;
  useItem: (slotIndex: number) => void;
  destroyItem: (slotIndex: number) => void;
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
  inventory: Array(25).fill(null),
});

export const useGameStore = create<GameState>((set, get) => ({
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

  startNewGame: (seed?: string) => {
    const floorSeed = seed || `floor-1-${Date.now()}`;
    const newFloor = generateFloor(floorSeed, {
      width: 5,
      height: 5,
      wallDensity: 0.5, // Increased density for dungeon feel
      enemyBudget: 3,
      chestBudget: 2,
      minPathLength: 5,
      floorNumber: 1,
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
    });

    // Keep player stats but reset position to new entrance
    const updatedPlayer = { ...state.player };
    updatedPlayer.pos = { ...newFloor.entrance };

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

    const runEnemyTurnAfterPlayerAction = () => {
      const postState = get();
      if (!postState.floor) return;

      const enemyProcessed = runEnemyTurnModule({
        floor: postState.floor,
        playerPos: postState.player.pos,
      });
      set(enemyProcessed);

      // Apply enemy melee attacks to player HP
      if (enemyProcessed.attacks && enemyProcessed.attacks.length > 0) {
        const totalDamage = enemyProcessed.attacks.reduce((sum, atk) => {
          const attacker = postState.floor!.entities.find(e => e.id === atk.attackerId);
          if (!attacker || attacker.kind !== 'enemy') return sum;
          const data = attacker.data as EnemyData;
          const dmg = Math.max(5, (data.damage || 5) - postState.player.armor);
          return sum + dmg;
        }, 0);
        if (totalDamage > 0) {
          set((s) => ({
            player: { ...s.player, hp: Math.max(0, s.player.hp - totalDamage) },
            interaction: enemyProcessed.interaction || s.interaction,
          }));
        }
      }

      // Auto-clear transient aggro/attack interaction after a brief delay
      if (enemyProcessed.interaction?.type === 'enemy-aggro' || enemyProcessed.interaction?.type === 'enemy-attack') {
        setTimeout(() => {
          set((s) => ({ interaction: s.interaction && (s.interaction.type === 'enemy-aggro' || s.interaction.type === 'enemy-attack') ? null : s.interaction }));
        }, 500);
      }
    };

    const result = attemptMove(state.player, direction, state.floor);

    if (result.success && result.newPos) {
      // Prepare updates
      let updatedPlayer = { ...state.player, pos: result.newPos };
      let updatedFloor = state.floor;

      // Handle item pickup
      if (result.newInventory && result.itemEntityIdToRemove) {
        updatedPlayer.inventory = result.newInventory;
        updatedFloor = {
          ...state.floor,
          entities: state.floor.entities.filter(e => e.id !== result.itemEntityIdToRemove)
        };
      }

      set((state) => ({
        player: updatedPlayer,
        floor: updatedFloor,
        turnCount: state.turnCount + 1,
      }));

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

        // Check for death
        if (get().player.hp <= 0) {
          set({
            gameOver: true,
            victoryMessage: 'You died! A trap dealt fatal damage.',
          });
        }
      }

      // Run enemy turns after player movement
      runEnemyTurnAfterPlayerAction();
    } else if (result.attackedEnemy) {
      // Handle attack
      const enemy = result.attackedEnemy;
      const player = state.player;
      
      // Calculate damage
      const enemyData = enemy.data as EnemyData; 
      const damage = Math.max(5, player.weaponDamage - (enemyData?.armor || 0));
      
      // Update enemy HP
      const newHp = (enemyData?.hp || 0) - damage;
      
      // Update floor entities
      // We map to update the specific enemy, then filter to remove dead ones
      const newEntities = state.floor.entities.map(e => {
        if (e.id === enemy.id) {
          return { ...e, data: { ...e.data, hp: newHp } };
        }
        return e;
      }).filter(e => {
        if (e.kind !== 'enemy') return true;
        const data = e.data as EnemyData;
        return data.hp > 0;
      });
      
      // Set interaction state for animation and update floor
      set({
        interaction: {
          type: 'attack',
          targetPos: enemy.pos,
          timestamp: Date.now()
        },
        floor: {
          ...state.floor,
          entities: newEntities
        },
        turnCount: state.turnCount + 1
      });

      // Enemy reacts immediately (damage trigger for follow)
      runEnemyTurnAfterPlayerAction();
    } else {
      // No movement occurred (blocked/out-of-bounds/etc). Treat as a turn so enemies can react.
      // This fixes cases where enemies only aggro after you successfully move adjacent.
      set((s) => ({ turnCount: s.turnCount + 1 }));
      runEnemyTurnAfterPlayerAction();
    }

    return result;
  },

  resetGame: () => {
    set({
      player: createInitialPlayer(),
      floor: null,
      turnCount: 0,
      floorNumber: 1,
      gameStarted: false,
      gameOver: false,
      victoryMessage: null,
      inventoryOpen: false,
      selectedItemSlot: null,
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

  // Shared enemy-turn runner for non-movement actions (items, etc)
  // Keeps behavior consistent: any turn-consuming action should advance the enemy turn.
  _runEnemyTurnAfterPlayerAction: () => {
    const state = get();
    if (!state.floor || state.gameOver) return;

    const enemyProcessed = runEnemyTurnModule({
      floor: state.floor,
      playerPos: state.player.pos,
    });
  set(enemyProcessed);

    if (enemyProcessed.attacks && enemyProcessed.attacks.length > 0) {
      const totalDamage = enemyProcessed.attacks.reduce((sum, atk) => {
        const attacker = state.floor!.entities.find((e) => e.id === atk.attackerId);
        if (!attacker || attacker.kind !== 'enemy') return sum;
        const data = attacker.data as EnemyData;
        const dmg = Math.max(5, (data.damage || 5) - state.player.armor);
        return sum + dmg;
      }, 0);
      if (totalDamage > 0) {
        set((s) => ({
          player: { ...s.player, hp: Math.max(0, s.player.hp - totalDamage) },
          interaction: enemyProcessed.interaction || s.interaction,
        }));
      }
    }

    if (enemyProcessed.interaction?.type === 'enemy-aggro' || enemyProcessed.interaction?.type === 'enemy-attack') {
      setTimeout(() => {
        set((s) => ({
          interaction:
            s.interaction && (s.interaction.type === 'enemy-aggro' || s.interaction.type === 'enemy-attack')
              ? null
              : s.interaction,
        }));
      }, 500);
    }
  },

  useItem: (slotIndex: number) => {
    const state = get();
    const item = state.player.inventory[slotIndex];
    
    if (!item || item.kind !== 'consumable') {
      return;
    }

    const { player: updatedPlayer, inventory: newInventory } = applyItemUse(
      state.player,
      slotIndex
    );

    set({
      player: {
        ...updatedPlayer,
        inventory: newInventory,
      },
      selectedItemSlot: null,
      turnCount: state.turnCount + 1, // Using an item consumes a turn
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

    set({
      player: {
        ...state.player,
        inventory: newInventory,
      },
      selectedItemSlot: null,
    });
  },
}));
