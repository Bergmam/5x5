# Combat (deterministic)

- No RNG in combat; every action resolves deterministically.
- Turn order: player action → every enemy on floor acts.
- Damage: flat multiples of 5. Minimum damage on any successful damaging action is 5.

Damage formula:
- RawAttack = WeaponDamage (for physical) or SpellDamage (for spells)
- FinalDamage = max(5, RawAttack - Target.Armor)

Examples:
- Weapon 15 vs Armor 5 → FinalDamage = 10
- Spell 20 vs Armor 10 → FinalDamage = 10
- Weapon 10 vs Armor 15 → FinalDamage = 5

All heals and mana costs are multiples of 5.

## Combat Interaction
- **Attack on Move**: When the player is adjacent to an enemy and attempts to move into their tile, it counts as a melee attack.
  - The player inflicts their current weapon damage to the enemy.
  - The player **remains on their current tile** (does not move into the enemy's space, even if the enemy dies).
- **Visual Feedback**:
  - A small animation plays: the player sprite quickly pushes towards the enemy and returns to the original position ("bump" animation).

## Enemy Attacks
- **Adjacency rule**: If an enemy is orthogonally adjacent to the player (up/down/left/right) and would move this turn, it instead performs a melee attack.
  - Enemy damage starts at 5 on floor 1 and scales in multiples of 5 on deeper floors (e.g., 10, 15, ... based on progression).
  - Damage is applied to the player using the same deterministic formula: `FinalDamage = max(5, EnemyDamage - PlayerArmor)`.
- **Visual Feedback**:
  - Enemies use the same attack animation as the player: a quick push/bump towards the player's tile.
- **Post-attack effect**:
  - The player’s HP is reduced immediately after the enemy attack resolves.

## Implementation Plan

### Game Logic (`src/store/gameStore.ts`)
1. **Movement Interception**:
   - In `movePlayer` (or internal `attemptMove`), check if the target tile contains an enemy.
   - If yes, **do not update player position**.
   - Instead, call a new internal action `attackEnemy(enemyId)`.

2. **Combat Resolution**:
   - Implement damage calculation: `damage = max(5, player.damage - enemy.armor)`.
   - Update the specific enemy in `state.floor.entities`.
   - If `enemy.hp <= 0`, remove them from the array.

3. **Animation State**:
   - Add a transient state to `GameState`:
     ```ts
     interaction: {
       type: 'attack' | 'bump';
       targetPos: Vec2;
       timestamp: number;
     } | null;
     ```
   - When attacking, set this state. The UI (`GameBoard.tsx`) will read this to trigger a CSS animation or Framer Motion effect on the player sprite.

### Enemy Attack Resolution (`src/game/enemyAI.ts` + store wiring)
1. In the enemy turn loop, before moving an enemy, check orthogonal adjacency to the player.
2. If adjacent and the enemy intends to move, suppress movement and emit an attack interaction targeted at the player's position.
3. Compute enemy damage: `damage = max(5, enemy.damage - player.armor)`; apply to player HP in the store after enemy turn result is set.
4. Use the same interaction animation payload as player attacks for consistency.


