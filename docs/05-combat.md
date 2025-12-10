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


