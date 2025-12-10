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
    level: number;
    ai: 'static' | 'patrol' | 'follow';
    spawnPos: { x: number; y: number };
    state?: {
      mode: 'static' | 'patrol' | 'follow';
      lastSeenPlayerAt?: { x: number; y: number };
    };
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

## Enemy Movement (Design Spec)

### Movement Patterns
- **static**: Enemy does not move.
- **patrol**: Enemy wanders but never strays more than 2 tiles (Manhattan distance ≤ 2) from its `spawnPos`.
- **follow**: Enemy actively chases the player.

### Mode Transitions
- Enemies start in their configured `ai` mode.
- They enter **follow** mode if either condition is met:
  1. The player is within 2 tiles (Manhattan distance ≤ 2).
  2. The enemy takes damage.
- Future: We may hardcode special behaviors per enemy type.

### UX Cues on Follow
- When an enemy switches to **follow**, play a brief animation:
  - Show a small exclamation mark `!` above the enemy.
  - Perform a quick “jump” (y-offset or scale) to indicate aggro.

### Implementation Plan (future)
- Add `ai` and `state.mode` to `EnemyData`.
- In the enemy turn loop:
  - Evaluate triggers (proximity/damage) to set `state.mode = 'follow'`.
  - For patrol: choose a valid adjacent tile that keeps distance ≤ 2 from `spawnPos`.
  - For follow: move towards the player using a simple heuristic (greedy Manhattan step), respecting walls.
  - Emit a transient UI state for the aggro animation when switching to follow.

### Constraints & Edge Cases
- Respect walls and non-walkable tiles; enemies cannot move through walls.
- Avoid overlapping entities; if target tile occupied, skip move or choose alternate.
- If patrol is blocked (no valid tiles within radius), enemy idles.
- If follow cannot approach due to obstacles, enemy idles or switches back after timeout (future rule).

## Implementation Details (engineering)

### Turn loop hook-ups
- Location: `src/store/gameStore.ts` → after player move resolution, run `enemyTurn()`.
- Function signature:
  ```ts
  function enemyTurn(state: GameState): GameState
  ```
- Responsibilities:
  - Iterate `floor.entities` for `kind === 'enemy'`.
  - For each enemy, compute next `state.mode` based on triggers.
  - Compute desired next position; validate with map walkability and collisions.
  - Apply movement immutably to `floor.entities`.
  - Collect transient UI events (aggro `!` + jump) into `interaction` array.

### Triggers (deterministic)
- Proximity: `manhattan(enemy.pos, player.pos) <= 2` → set `state.mode = 'follow'`.
- Damage: Any reduction in `enemy.data.hp` since last turn → set `state.mode = 'follow'`.
- Persist follow until player distance > 3 for 2 consecutive turns (future tuning).

### Patrol step selection
- Candidates: 4-adjacent tiles around `enemy.pos` that are walkable AND `manhattan(tile, spawnPos) <= 2`.
- Selection: Prefer tiles that increase coverage diversity:
  - Keep a simple `patrolIndex` in `state` (0..3) cycling directions, or pick random with seeded RNG per enemy (`seed = floor.seed + enemy.id`).
- If no candidates: idle.

### Follow step selection
- Greedy Manhattan descent:
  - Compute `dx = sign(player.x - enemy.x)`, `dy = sign(player.y - enemy.y)`.
  - Try axis with larger absolute difference first; fallback to other axis.
  - If both blocked, idle.
- Optional future: When blocked, attempt a single detour step that reduces distance next turn.

### Collision & occupancy rules
- Enemies cannot move into walls or non-walkable tiles.
- Do not stack entities: if target tile is occupied (enemy/item), skip move.
- Entrance/Exit tiles are walkable; allow enemy occupancy for now (future rule may forbid).

### Animation events
- On mode switch to `follow`, emit:
  ```ts
  interactionEvents.push({
    type: 'enemy-aggro',
    enemyId,
    pos: enemy.pos,
    timestamp: Date.now(),
    fx: { icon: '!', jump: true }
  })
  ```
- UI (`GameBoard.tsx`) renders transient icon above enemy and a quick translateY/scale effect.

### Data additions
- Extend `EnemyData`:
  ```ts
  interface EnemyData {
    // existing fields...
    ai: 'static' | 'patrol' | 'follow';
    spawnPos: Vec2;
    state?: { mode: 'static' | 'patrol' | 'follow'; patrolIndex?: number; lastHp?: number };
  }
  ```

### Testing outline
- Unit: Given enemy at spawn with `ai='patrol'`, ensure move stays within radius.
- Unit: Given proximity/damage, ensure mode switches to follow and emits aggro event.
- Property: For random seeds, no enemy moves through walls; no overlapping positions post-turn.
- Integration: Simulate N turns; verify enemies do not drift beyond patrol bounds and follow reduces distance on open maps.

