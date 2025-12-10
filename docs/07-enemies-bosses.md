# Enemies & Bosses

- Enemy behaviors: stationary, random-wander (within 5×5), patrol, pursuit.
- Boss placement is designer-controlled; can use deterministic placement or pool-based content variety (not combat RNG).
- Enemy stats follow the multiples-of-5 constraint and use the flat damage rules.

## Visuals
- **Health Bar**: Enemies display a health bar on top of their sprite (within their grid cell) **only if** they have taken damage but are still alive. Full HP enemies do not show a bar.

## Balancing & Progression
- **Level 1 Enemies**: Should have exactly **5 HP**.
  - This ensures they are killed in one hit by a player with no items (assuming base damage >= 5).
- **Scaling**: Enemies get progressively harder (more HP/Armor/Damage) on deeper floors.

## Implementation Plan

### Data Structure (`src/game/types.ts`)
- Ensure `EntityBase`'s `data` property for enemies conforms to:
  ```ts
  interface EnemyData {
    hp: number;
    maxHp: number;
    damage: number;
    armor: number;
    xpValue: number;
  }
  ```

### Generator Logic (`src/game/generator.ts`)
- Update the enemy placement loop.
- Instead of generic data, initialize specific stats:
  - **Floor 1**: `hp: 5, maxHp: 5, damage: 5, armor: 0`.
  - **Floor N**: Scale stats using the "multiples of 5" rule (e.g., `hp = 5 * floor`).

### UI Component (`src/components/GameBoard.tsx`)
- Update the entity rendering loop to use a specialized `EnemyRenderer` or inline logic.
- **Health Bar**:
  - Render a small bar (e.g., 2-3px height) at the top of the cell.
  - **Logic**: `if (enemy.data.hp < enemy.data.maxHp)` show the bar.
  - **Width**: `(hp / maxHp) * 100%`.
  - **Color**: Red or distinct from other UI elements.

