# Map data model & generator implementation plan

This document captures the data representation and the deterministic, seeded generator plan for single 5×5 floor modules. It's written to be directly translatable into a TypeScript implementation under `src/game`.

## Contract
- Inputs: `seed: string | number`, `config: GenerationConfig`
- Output: `MapFloor` — a deterministic, serializable object describing tiles, entities, entrance/exit, and metadata.
- Success criteria:
  - Deterministic: same seed+config => identical `MapFloor`.
  - Solvable: a valid path exists from entrance to exit under player movement rules.
  - Constrained: adheres to spawn/item budgets and placement rules.

## Core types (implementation-ready)

Use a flat row-major tiles array for compactness and serialization.

```ts
type Vec2 = { x: number; y: number };

type TileKind = 'floor' | 'wall' | 'entrance' | 'exit' | 'door' | 'trap' | 'chest' | 'water';

interface Tile {
  pos: Vec2;
  kind: TileKind;
  walkable: boolean;
  blocksVision?: boolean;
  meta?: Record<string, unknown>;
}

interface EntityBase {
  id: string;
  kind: 'enemy' | 'item' | 'relic' | 'npc';
  pos: Vec2;
  data?: Record<string, unknown>;
}

interface MapFloor {
  width: number; // 5
  height: number; // 5
  seed: string;
  tiles: Tile[]; // length == 25
  entities: EntityBase[];
  entrance: Vec2;
  exit: Vec2;
  generatedAt: string;
  version?: string;
}
```

Helpers: `indexFromPos(pos, width)` and `posFromIndex(i, width)`.

## Deterministic RNG
- Export `createRng(seed)` returning a function `() => number` in [0,1).
- Implementations: `mulberry32`, `xorshift32`, or a tiny deterministic PRNG. Keep dependency-free.

## Generation pipeline (pure functions)
1. `rng = createRng(seed)`
2. Choose entrance/exit positions.
   - **Multi-level rule**: Level N entrance must match Level N-1 exit coordinates.
   - **Exit placement**: If not provided, choose a completely random tile (excluding entrance).
3. Initialize all tiles as `wall`.
4. `path = makePath(entrance, exit, rng)` — carve a guaranteed path (set to `floor`).
5. **Carve Rooms**: Select random points and clear 2x2 or 3x3 areas (or just random tiles) to create open spaces, ensuring they connect to the path.
   - Alternative: Just carve `floorDensity` % of remaining walls to create organic caves/ruins.
6. Place doors/traps/chests with placement heuristics (chests adjacent to path, traps off-path).
7. Place entities (enemies/items) respecting `enemyBudget`, `chestBudget`, and placement constraints.
8. Validate (BFS solvability + budgets). If invalid, either retry with a deterministic counter or fall back to a safe template.
9. Return `MapFloor`.

### Why carve the path first
Guarantees solvability. Starting with walls and carving the path naturally creates corridors. Adding rooms afterwards creates the "dungeon" feel.

## makePath algorithm (reliable, simple)
- Greedy-biased random walk that prefers steps toward the exit but occasionally detours to add variety.
- Keep track of visited tiles to avoid immediate cycles.
- Because the grid is tiny, rerun until path length meets `minPathLength` if needed.

Alternative: run A* on an empty grid with deterministic random weights assigned per tile to produce a reproducible path.

## Placement heuristics
- Minimum distance from entrance for enemies (e.g., >= 2) to avoid spawn-on-top grief.
- Chests: prefer tiles adjacent to path tiles.
- Avoid stacking entities on the same tile.
- For boss floors use pre-made templates or curated algorithms ensuring open space.

## Validation
- BFS from `entrance` (4-directional movement) to confirm `exit` reachable.
- Budget checks for enemies/items.
- Optionally extra checks: ensure there is at least one chest reachable or other designer constraints.

## Config shape

```ts
interface GenerationConfig {
  width: number; // usually 5
  height: number; // usually 5
  wallDensity: number; // 0..1
  enemyBudget: number;
  chestBudget: number;
  minPathLength?: number;
  entrance?: Vec2;
  exit?: Vec2;
  useTemplate?: boolean;
  templateId?: string;
}
```

## API surface (suggested)
- `createRng(seed)`
- `generateFloor(seed, config): MapFloor`
- `validateFloor(floor): ValidationResult`
- `serializeFloor(floor): string`
- `deserializeFloor(json): MapFloor`

## Testing plan
- Unit tests: RNG determinism, makePath properties (reaches exit), generator determinism, validator correctness.
- Property/integration tests: generate N floors with random seeds and assert solvability and budget observance.
- E2E: headless UI test that loads generated floor, optionally simulates simple moves.

## Developer notes
- Keep `src/game` framework-agnostic.
- Designers can add templates under `src/game/templates` as JSON files.
- If generation fails after X attempts, fall back to a safe template to guarantee development progress.

---

If you want, I can now scaffold the TS skeleton for `src/game` implementing `createRng`, types, `makePath`, `generateFloor`, and `validateFloor`, plus Vitest unit tests. Confirm and I'll create the files.
