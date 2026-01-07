import type { MapFloor, EnemyData, EntityBase } from '../../game/types';
import type { Player } from '../../game/movement';
import { runEnemyTurn as runEnemyTurnModule } from '../../game/enemyAI';
import { calculateEffectiveStats } from '../../game/stats';

export interface CombatSlice {
  // Combat actions
  _runEnemyTurnAfterPlayerAction: () => void;
  _triggerDeathIfNeeded: () => void;
  _handlePlayerAttackOnEnemy: (enemy: EntityBase, player: Player, floor: MapFloor) => void;
}

// Helper to generate combat text IDs
function makeCombatTextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`;
}

export const createCombatSlice = (
  set: any,
  get: any
): CombatSlice => ({
  _triggerDeathIfNeeded: () => {
    const s = get();
    if (s.gameOver) return;
    if (s.player.hp > 0) return;
    set({
      gameOver: true,
      victoryMessage: 'You died.',
    });
  },

  _runEnemyTurnAfterPlayerAction: () => {
    const state = get();
    if (!state.floor || state.gameOver) return;

    const effective = calculateEffectiveStats(
      {
        maxHp: state.player.maxHp,
        maxMp: state.player.maxMp,
        armor: state.player.armor,
        weaponDamage: state.player.weaponDamage,
        spellDamage: state.player.spellDamage,
      },
      state.player.inventory
    );

    const enemyProcessed = runEnemyTurnModule({
      floor: state.floor,
      playerPos: state.player.pos,
    });
    set(enemyProcessed);

    // Apply enemy melee attacks to player HP
    if (enemyProcessed.attacks && enemyProcessed.attacks.length > 0) {
      let totalDamage = 0;
      const floaterEvents: any[] = [];

      for (const atk of enemyProcessed.attacks) {
        const attacker = state.floor!.entities.find((e: EntityBase) => e.id === atk.attackerId);
        if (!attacker || attacker.kind !== 'enemy') continue;
        const data = attacker.data as EnemyData;
        const dmg = Math.max(0, (data.damage || 0) - effective.armor);
        totalDamage += dmg;

        floaterEvents.push({
          id: makeCombatTextId('enemy-dmg'),
          kind: 'damage',
          amount: dmg,
          from: { ...attacker.pos },
          to: { ...state.player.pos },
          icon: '⚔',
          createdAt: Date.now(),
          ttlMs: 650,
        });
      }

      // Always show floaters (even for 0 damage) when an attack occurred.
      if (floaterEvents.length > 0) {
        get()._enqueueCombatText(floaterEvents);
      }

      if (totalDamage > 0) {
        set((s: any) => ({
          player: { ...s.player, hp: Math.max(0, s.player.hp - totalDamage) },
          interaction: enemyProcessed.interaction || s.interaction,
        }));
        get()._triggerDeathIfNeeded();
      }
    }

    // Auto-clear transient aggro/attack interaction after a brief delay
    if (enemyProcessed.interaction?.type === 'enemy-aggro' || enemyProcessed.interaction?.type === 'enemy-attack') {
      setTimeout(() => {
        set((s: any) => ({ 
          interaction: s.interaction && (s.interaction.type === 'enemy-aggro' || s.interaction.type === 'enemy-attack') ? null : s.interaction 
        }));
      }, 500);
    }
  },

  _handlePlayerAttackOnEnemy: (enemy: EntityBase, player: Player, floor: MapFloor) => {
    const state = get();
    
    // Calculate damage
    const enemyData = enemy.data as EnemyData;
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
    const damage = Math.max(0, effective.weaponDamage - (enemyData?.armor || 0));

    // Damage floater (show even 0)
    get()._enqueueCombatText({
      id: makeCombatTextId('player-dmg'),
      kind: 'damage',
      amount: damage,
      from: { ...player.pos },
      to: { ...enemy.pos },
      icon: '🗡️',
      createdAt: Date.now(),
      ttlMs: 650,
    });
    
    // Update enemy HP
    const newHp = (enemyData?.hp || 0) - damage;
    
    // Update floor entities
    // We map to update the specific enemy, then filter to remove dead ones
    const newEntities = floor.entities.map((e: EntityBase) => {
      if (e.id === enemy.id) {
        return { ...e, data: { ...e.data, hp: newHp } };
      }
      return e;
    }).filter((e: EntityBase) => {
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
        ...floor,
        entities: newEntities
      },
      turnCount: state.turnCount + 1
    });

    // Enemy reacts immediately (damage trigger for follow)
    get()._runEnemyTurnAfterPlayerAction();
  },
});
