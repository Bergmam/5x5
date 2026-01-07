import type { MapFloor } from '../../game/types';
import type { Player, Direction, MoveResult } from '../../game/movement';
import { attemptMove } from '../../game/movement';
import { getAbilityBarFromInventory, normalizeDirection } from '../../game/abilities';
import { generateShopInventory } from '../../data/itemLoader';
import { createRng } from '../../game/rng';
import { calculateEffectiveStats } from '../../game/stats';

export interface MovementSlice {
  lastMoveDirection: Direction | null;
  
  movePlayer: (direction: Direction) => MoveResult;
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

export const createMovementSlice = (
  set: any,
  get: any
): MovementSlice => ({
  lastMoveDirection: null,

  movePlayer: (direction: Direction): MoveResult => {
    const state = get();
    
    if (!state.floor || state.gameOver) {
      return { success: false, reason: 'game-not-active' };
    }

    // Helper: Handle successful player movement
    const handleSuccessfulMove = (result: MoveResult, updatedState: any) => {
      let updatedPlayer = { ...updatedState.player, pos: result.newPos! };
      let updatedFloor = updatedState.floor!;

      // Handle item pickup
      if (result.newInventory && result.itemEntityIdToRemove) {
        updatedPlayer.inventory = result.newInventory;
        updatedPlayer = clampResourcesToEffectiveMax(updatedPlayer);
        updatedFloor = {
          ...updatedState.floor!,
          entities: updatedState.floor!.entities.filter((e: any) => e.id !== result.itemEntityIdToRemove)
        };
      }

      // Update game state with new position and inventory
      set((s: any) => ({
        player: updatedPlayer,
        floor: updatedFloor,
        turnCount: s.turnCount + 1,
        abilityBar: getAbilityBarFromInventory(updatedPlayer.inventory, 8),
      }));

      // Handle shop proximity check
      handleShopProximity(updatedPlayer, updatedFloor, updatedState);

      // Handle floor transitions
      if (result.triggeredExit) {
        get().nextFloor();
      }

      // Handle trap damage
      if (result.triggeredTrap) {
        handleTrapDamage();
      }

      // Advance enemy turns
      get()._runEnemyTurnAfterPlayerAction();
    };

    // Helper: Check if player moved away from shopkeeper
    const handleShopProximity = (
      player: Player, 
      floor: MapFloor, 
      currentState: any
    ) => {
      if (currentState.shopOpen) {
        const shopkeeper = floor.entities.find(
          (e) => e.kind === 'npc' && (e.data as Record<string, unknown>)?.npcType === 'shopkeeper'
        );
        get()._closeShopIfTooFar(player.pos, shopkeeper?.pos || null);
      }
    };

    // Helper: Handle trap damage
    const handleTrapDamage = () => {
      const trapDamage = 10;
      set((s: any) => ({
        player: {
          ...s.player,
          hp: Math.max(0, s.player.hp - trapDamage),
        },
      }));
      get()._triggerDeathIfNeeded();
    };

    // Helper: Handle NPC interactions
    const handleNPCInteraction = (npcEntity: any, currentState: any): MoveResult => {
      const npcData = npcEntity.data as Record<string, unknown>;
      
      if (npcData?.npcType === 'shopkeeper') {
        const shopRng = createRng(`shop-${currentState.floor!.seed}`);
        const shopItems = generateShopInventory(shopRng);
        get()._openShop(shopItems);
      }
      
      // Don't advance turn or run enemy AI for NPC interaction
      return { success: false, reason: 'npc-collision', attackedEnemy: npcEntity };
    };

    // Helper: Handle blocked movement (no successful move)
    const handleBlockedMove = () => {
      set((s: any) => ({ turnCount: s.turnCount + 1 }));
      get()._runEnemyTurnAfterPlayerAction();
    };

    // Main movement logic
    const result = attemptMove(state.player, direction, state.floor);
    const normalizedDirection = normalizeDirection(direction);
    
    set({ lastMoveDirection: normalizedDirection });

    if (result.success && result.newPos) {
      handleSuccessfulMove(result, state);
    } else if (result.attackedEnemy) {
      if (result.attackedEnemy.kind === 'npc') {
        return handleNPCInteraction(result.attackedEnemy, state);
      }
      // Handle attack on enemy - delegate to combat slice
      get()._handlePlayerAttackOnEnemy(result.attackedEnemy, state.player, state.floor);
    } else {
      handleBlockedMove();
    }

    return result;
  },
});
