# State Management Architecture

## Overview

This project uses **Zustand** for state management with a **slice pattern** to organize different concerns into manageable modules. The main game store (`gameStore.ts`) has been refactored from a monolithic 732-line file into a modular architecture with focused slices.

## Current Architecture

### File Structure
```
src/store/
  ├── gameStore.ts (292 lines) - Main orchestration & game lifecycle
  └── slices/
      ├── shopSlice.ts (132 lines) - Shop economy & transactions
      ├── combatSlice.ts (163 lines) - Combat mechanics & enemy AI
      ├── inventorySlice.ts (101 lines) - Inventory management
      └── movementSlice.ts (153 lines) - Player movement & interactions
```

### Benefits of This Architecture
- **Separation of Concerns**: Each slice handles a specific domain (shop, combat, inventory, movement)
- **Maintainability**: Smaller files (100-165 lines) are easier to understand and modify
- **Testability**: Isolated concerns make unit testing more straightforward
- **Reusability**: Slices can be composed together or tested independently
- **Reduced Complexity**: Main gameStore focuses on orchestration, not implementation details

## Slice Pattern

### Basic Structure

Each slice follows this pattern:

```typescript
// 1. Define the interface for the slice
export interface MySlice {
  // State
  myState: SomeType;
  
  // Public actions (called from components)
  myAction: () => void;
  
  // Internal actions (called from other slices, prefixed with _)
  _myInternalAction: () => void;
}

// 2. Create a factory function that generates the slice
export const createMySlice = (
  set: StoreApi<GameState>['setState'],
  get: StoreApi<GameState>['getState']
): MySlice => ({
  // Initial state
  myState: initialValue,
  
  // Action implementations
  myAction: () => {
    const state = get();
    // ... logic here
    set({ myState: newValue });
  },
  
  _myInternalAction: () => {
    // Internal helper for other slices
  },
});
```

### Integration in Main Store

In `gameStore.ts`, slices are merged into the main state:

```typescript
import { createMySlice, type MySlice } from './slices/mySlice';

interface GameState extends MySlice, OtherSlice {
  // Additional main store state
}

export const useGameStore = create<GameState>((set, get) => ({
  // Merge all slices
  ...createMySlice(set, get),
  ...createOtherSlice(set, get),
  
  // Main store state and actions
  // ...
}));
```

## Existing Slices

### 1. Shop Slice (`shopSlice.ts`)

**Responsibility**: Manages shop economy, transactions, and shop UI state

**State**:
- `shopOpen: boolean` - Whether shop UI is visible
- `shopInventory: Item[]` - Items available for purchase
- `selectedShopSlot: number | null` - Currently selected shop item

**Public Actions**:
- `toggleShop()` - Open/close shop UI
- `buyShopItem(index)` - Purchase an item from shop
- `sellItem(slot)` - Sell an item from player inventory

**Internal Actions**:
- `_openShop(items)` - Initialize shop with inventory
- `_closeShopIfTooFar(playerPos, shopkeeperPos)` - Auto-close when player moves away

**Key Features**:
- Gold validation before purchase
- Inventory space checking
- Proximity-based auto-close (Manhattan distance)
- Sale value calculation (25% of item value)

### 2. Combat Slice (`combatSlice.ts`)

**Responsibility**: Handles combat mechanics, damage calculation, and enemy AI

**Internal Actions**:
- `_runEnemyTurnAfterPlayerAction()` - Execute enemy turns after player acts
- `_triggerDeathIfNeeded()` - Check and handle player death
- `_handlePlayerAttackOnEnemy(enemy, player, floor)` - Process player attacks

**Key Features**:
- Damage calculation with armor reduction
- Combat text generation for damage numbers
- Death detection and game over handling
- Enemy AI coordination (eliminated duplicate logic)
- Attack animations with timestamp tracking

**Refactoring Win**: Unified enemy turn logic that was previously duplicated in two places with different implementations.

### 3. Inventory Slice (`inventorySlice.ts`)

**Responsibility**: Manages inventory UI and item usage

**State**:
- `inventoryOpen: boolean` - Whether inventory UI is visible
- `selectedItemSlot: number | null` - Currently selected inventory slot

**Public Actions**:
- `toggleInventory()` - Open/close inventory UI
- `selectItem(slot)` - Select an item slot
- `useItem(slot)` - Use/equip an item
- `destroyItem(slot)` - Destroy an item

**Key Features**:
- Consumable item usage (potions heal/restore MP)
- Ability bar updates when inventory changes
- Resource clamping to effective maximums

### 4. Movement Slice (`movementSlice.ts`)

**Responsibility**: Orchestrates player movement and world interactions

**State**:
- `lastMoveDirection: Direction | null` - For animation tracking

**Public Actions**:
- `movePlayer(direction)` - Main movement handler

**Internal Helpers** (within the slice):
- `handleSuccessfulMove()` - Position updates, item pickups, shop proximity, exits, traps
- `handleShopProximity()` - Auto-close shop when too far from shopkeeper
- `handleTrapDamage()` - Apply trap damage effects
- `handleNPCInteraction()` - Shopkeeper interactions
- `handleBlockedMove()` - Handle failed movement attempts

**Utility Function**:
- `clampResourcesToEffectiveMax(player)` - Ensures HP/MP don't exceed maximums

**Key Features**:
- Collision detection
- Item pickup on movement
- Trap triggering
- NPC interactions
- Shop proximity checking
- Floor transition triggering
- Delegates to combat slice for enemy attacks

## Communication Between Slices

Slices communicate through the shared `get()` function:

```typescript
// In movementSlice.ts
export const createMovementSlice = (set, get) => ({
  movePlayer: (direction) => {
    // ... movement logic ...
    
    // Call action from combat slice
    get()._runEnemyTurnAfterPlayerAction();
    
    // Call action from shop slice
    get()._closeShopIfTooFar(playerPos, shopkeeperPos);
  }
});
```

**Convention**: Internal actions meant to be called by other slices are prefixed with `_`.

## Creating a New Slice

### Step-by-Step Guide for Future Development

When adding new functionality that would benefit from isolation, follow this process:

#### 1. Identify the Domain

Ask yourself:
- Does this feature have distinct state that doesn't belong elsewhere?
- Will it have 3+ related actions?
- Does it interact with other slices but have its own concerns?
- Would it make the main store or existing slices too large (>200 lines)?

Good candidates: abilities system, visual effects, progression/unlocks, dialog system, quest system

#### 2. Create the Slice File

Create `src/store/slices/myFeatureSlice.ts`:

```typescript
import type { StoreApi } from 'zustand';
import type { GameState } from '../gameStore';
// Import any types you need

/**
 * MyFeature Slice - Brief description of responsibility
 */
export interface MyFeatureSlice {
  // State
  myFeatureState: SomeType;
  anotherState: AnotherType;
  
  // Public actions (called from UI components)
  doSomething: () => void;
  doSomethingElse: (param: Type) => void;
  
  // Internal actions (called from other slices, prefix with _)
  _internalHelper: () => void;
}

export const createMyFeatureSlice = (
  set: StoreApi<GameState>['setState'],
  get: StoreApi<GameState>['getState']
): MyFeatureSlice => ({
  // Initialize state
  myFeatureState: initialValue,
  anotherState: initialValue,
  
  // Implement actions
  doSomething: () => {
    const state = get();
    // Your logic here
    set({ myFeatureState: newValue });
  },
  
  doSomethingElse: (param) => {
    // Implementation
  },
  
  _internalHelper: () => {
    // Helper for other slices
  },
});
```

#### 3. Extract from Main Store

If you're refactoring existing code:

1. **Identify the code to extract**: Look for related state and actions in `gameStore.ts`
2. **Check dependencies**: Note which other slices or utilities are used
3. **Consider internal refactoring first**: If a method is very long (>50 lines), break it into helper functions before extraction
4. **Copy to new slice**: Move state, types, and action implementations
5. **Update imports**: Ensure all dependencies are imported in the new slice

#### 4. Integrate into GameStore

In `src/store/gameStore.ts`:

```typescript
// 1. Import the slice
import { createMyFeatureSlice, type MyFeatureSlice } from './slices/myFeatureSlice';

// 2. Extend GameState interface
interface GameState extends ShopSlice, CombatSlice, MyFeatureSlice {
  // ... other state
}

// 3. Merge the slice in store creation
export const useGameStore = create<GameState>((set, get) => ({
  // Merge all slices
  ...createShopSlice(set, get),
  ...createCombatSlice(set, get),
  ...createMyFeatureSlice(set, get),  // <-- Add here
  
  // ... rest of store
}));
```

#### 5. Remove Duplicates

After integration:
1. Remove the old state declarations from `gameStore.ts` interface
2. Remove the old state initializations from the store
3. Remove the old action implementations
4. Remove any helper functions that moved to the slice

#### 6. Test Thoroughly

```bash
pnpm test
```

All existing tests should pass. If they don't:
- Check for missing imports
- Verify state is properly initialized in the slice
- Ensure actions are correctly merged into the store

#### 7. Update Documentation

Add your new slice to this document's "Existing Slices" section.

## Best Practices

### ✅ Do:
- **Keep slices focused**: One clear responsibility per slice
- **Use internal actions**: Prefix with `_` for actions meant for other slices
- **Extract helpers**: Long methods (>50 lines) should have internal helper functions
- **Document responsibility**: Add a brief comment explaining what the slice manages
- **Test after extraction**: Ensure all tests pass before and after refactoring
- **Consider dependencies**: Import only what you need

### ❌ Don't:
- **Create tiny slices**: If it's only 1-2 actions, it might belong in the main store
- **Duplicate logic**: Ensure single source of truth for shared behavior
- **Circular dependencies**: Slices can call each other but shouldn't create cycles
- **Skip testing**: Always run the full test suite after slice extraction
- **Forget TypeScript**: Maintain strict type safety in slice interfaces

## Refactoring History

### January 2026 - Initial Slice Extraction

**Original State**: Single `gameStore.ts` file with 732 lines

**Refactoring Process**:
1. **Shop Slice** (132 lines) - Extracted shop economy and UI management
2. **Combat Slice** (163 lines) - Unified combat mechanics, eliminated duplicate enemy turn logic
3. **Inventory Slice** (101 lines) - Isolated inventory UI and item usage
4. **Movement Slice** (153 lines) - Extracted after internal refactoring with helper functions

**Final State**: 
- `gameStore.ts`: 292 lines (60% reduction!)
- 4 focused slices: 549 lines total
- All 144 tests passing
- No functionality lost

**Key Achievement**: Improved maintainability while preserving all game features and test coverage.

## Future Slice Candidates

As the project grows, consider creating slices for:

- **Abilities Slice**: Ability casting, cooldowns, MP costs, targeting
- **Visual Effects Slice**: Animations, particles, screen shake, floating text
- **Progression Slice**: Level ups, unlocks, achievements, statistics
- **Dialog Slice**: NPC conversations, quest dialogs, story events
- **Audio Slice**: Sound effects, music, volume control

## Questions?

When deciding whether to create a new slice, ask:
1. Does this have 100+ lines of related logic?
2. Does it have distinct state that others don't need to modify directly?
3. Would it make testing easier?
4. Would it make the main store easier to understand?

If you answered "yes" to 2 or more, consider creating a slice.

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Slice Pattern](https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md#slices-pattern)
- Main Store: `src/store/gameStore.ts`
- Slices Directory: `src/store/slices/`
