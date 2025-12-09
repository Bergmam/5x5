# Inventory UI System

## Overview
This document defines the inventory UI: a collapsible 5×5 grid panel that displays items, allows interaction, and maintains the core "25 tiles" motif.

## Core Requirements
- Inventory is a 5×5 grid (25 slots total)
- No item stacking (one item per slot)
- Collapsible/expandable side panel (not full-screen)
- Items provide passive bonuses while in inventory (no "equipped" slots)
- Some items grant active abilities when carried
- UI should match the dark theme aesthetic

## Visual Design

### Collapsed State (Default)
- Small backpack icon button (🎒) in the HUD
- Shows item count: "12/25" next to icon
- Click to expand
- Keyboard shortcut: `I` key

### Expanded State (Side Panel)
- Appears on the right edge of the screen (not full-screen)
- 5×5 grid matching game board tile size
- Close button (X) in top-right corner
- No overlay background - just the panel slides in/appears
- Each slot shows:
  - Item icon/sprite if occupied
  - Empty slot visual if vacant
  - Item rarity color border
  - Hover tooltip with item details
- Close button or ESC key to collapse
- No fade in/out animations (instant show/hide)

### Item Slot Visual
```
┌─────────────┐
│             │
│   [Icon]    │  ← Item sprite/emoji only
│             │
└─────────────┘
   Rarity border color
```

No text shown in slot - only the icon/emoji with a colored border indicating rarity.

## Interaction States

### Slot States
1. **Empty**: Dark gray background, dashed border, no content
2. **Occupied**: Item icon only, rarity border
3. **Hover**: Show popup tooltip with full item details (name, description, stats)
4. **Clicked**: Show action buttons below item (Use/Destroy or just Destroy for passives)

### Item Actions (on click)
- **Use** (only for consumables): Apply effect, remove from inventory, consumes a turn
- **Destroy**: Remove from inventory permanently
- Click elsewhere or ESC to deselect

Action buttons appear when item is clicked:
- Consumables show: `[Use] [Destroy]`
- Passive items show: `[Destroy]` only

## Item Data Structure

Items are defined in JSON configuration files and loaded at runtime.

```typescript
interface InventoryItem {
  id: string; // unique item type id
  name: string;
  description: string;
  icon: string; // emoji or sprite identifier
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  kind: 'consumable' | 'passive' | 'ability-granting' | 'relic';
  
  // Stats (passive bonuses while in inventory)
  stats?: {
    hpBonus?: number; // multiples of 5
    mpBonus?: number;
    armorBonus?: number;
    weaponDamageBonus?: number;
    spellDamageBonus?: number;
  };
  
  // Consumable effect
  consumable?: {
    healHp?: number;
    restoreMp?: number;
  };
  
  // Ability granted while carried
  abilityId?: string;
}
```

### JSON Configuration Format

### JSON Configuration Format

```json
{
  "items": [
    {
      "id": "healing-potion",
      "name": "Healing Potion",
      "description": "Restores 20 HP",
      "icon": "🧪",
      "rarity": "common",
      "kind": "consumable",
      "consumable": {
        "healHp": 20
      }
    },
    {
      "id": "iron-plate",
      "name": "Iron Plate",
      "description": "A sturdy piece of metal",
      "icon": "🛡️",
      "rarity": "uncommon",
      "kind": "passive",
      "stats": {
        "armorBonus": 5
      }
    }
  ]
}
```

## Rarity Color Scheme (Dark Theme)
- **Common**: gray-500 border
- **Uncommon**: green-500 border
- **Rare**: blue-500 border
- **Epic**: purple-500 border

## Keyboard Shortcuts
- `I` or `Tab`: Toggle inventory open/close
- `ESC`: Close inventory
- Arrow keys: Navigate slots (when inventory open)
- `Enter` or `Space`: Select/use item
- `D`: Destroy selected item

## Mouse/Touch Interaction
- Click backpack icon in HUD → expand inventory panel
- **Hover over item slot** → show popup tooltip with full details
- **Click item slot** → show action buttons (Use/Destroy or just Destroy)
- Click X button → collapse inventory
- Click outside selected item → deselect

## Tooltip Content (on hover)

Popup appears above/beside the hovered item slot:

```
┌────────────────────────────┐
│ Healing Potion (Common)    │
│ ──────────────────────────│
│ Restores 20 HP when used   │
│                            │
│ "A small vial of red       │
│  liquid. Smells sweet."    │
└────────────────────────────┘
```

For passive items with stats:
```
┌────────────────────────────┐
│ Iron Plate (Uncommon)      │
│ ──────────────────────────│
│ +5 Armor                   │
│                            │
│ "A sturdy piece of metal"  │
└────────────────────────────┘
```

## State Management (Zustand)

```typescript
interface GameState {
  // ... existing state
  inventoryOpen: boolean;
  selectedItemSlot: number | null; // 0-24, null if none selected
  
  // actions
  toggleInventory: () => void;
  selectItem: (slotIndex: number) => void;
  useItem: (slotIndex: number) => void;
  destroyItem: (slotIndex: number) => void;
}
```

## Item Pickup Flow (from movement)
1. Player moves onto tile with item entity
2. Check if inventory has space (< 25 items)
3. If space:
   - Add item to first empty slot
   - Apply passive stat bonuses immediately
   - Remove item entity from floor
   - Show pickup notification
4. If full:
   - Show "Inventory Full" message
   - Item stays on floor
   - Player can still move onto the tile

## Item Use Flow (consumable)
1. Player opens inventory
2. Selects consumable item
3. Clicks "Use" button
4. Apply effect:
   - Heal HP/MP (clamp to max values, no "already at max" message)
   - Apply status effect
   - Trigger ability
5. Remove item from inventory
6. Recalculate passive bonuses (if item had stats)
7. **Consumes player's turn** (enemy moves after)
8. Close inventory or stay open

## Passive Stat Calculation
- On inventory change (add/remove item):
  - Sum all `stats.hpBonus` → add to player.maxHp
  - Sum all `stats.mpBonus` → add to player.maxMp
  - Sum all `stats.armorBonus` → add to player.armor
  - Sum all damage bonuses → add to player.weaponDamage/spellDamage
- Keep base stats separate from bonuses for UI clarity

Example:
```typescript
function calculateStats(player: Player): PlayerStats {
  const baseStats = { hp: 50, mp: 30, armor: 5, weaponDamage: 10 };
  const bonuses = player.inventory.reduce((acc, item) => {
    if (item?.stats) {
      acc.hp += item.stats.hpBonus || 0;
      acc.mp += item.stats.mpBonus || 0;
      acc.armor += item.stats.armorBonus || 0;
      acc.weaponDamage += item.stats.weaponDamageBonus || 0;
    }
    return acc;
  }, { hp: 0, mp: 0, armor: 0, weaponDamage: 0 });
  
  return {
    maxHp: baseStats.hp + bonuses.hp,
    maxMp: baseStats.mp + bonuses.mp,
    armor: baseStats.armor + bonuses.armor,
    weaponDamage: baseStats.weaponDamage + bonuses.weaponDamage,
  };
}
```

## Visual Layout (Expanded Inventory - Right Side Panel)

```
                                  ┌─────────────────────┐
                                  │ Inventory (12/25) [X]│
                                  ├─────────────────────┤
                                  │ ┌───┬───┬───┬───┬───┐
                                  │ │🧪 │🛡️│   │⚔️│   │  ← Icons only
                                  │ ├───┼───┼───┼───┼───┤
                                  │ │💎 │   │   │   │   │
                                  │ ├───┼───┼───┼───┼───┤
                                  │ │   │   │   │   │   │
                                  │ ├───┼───┼───┼───┼───┤
                                  │ │   │   │   │   │   │
                                  │ ├───┼───┼───┼───┼───┤
                                  │ │   │   │   │   │   │
                                  │ └───┴───┴───┴───┴───┘
                                  │                      │
                                  │ Clicked item actions:│
                                  │ [Use] [Destroy]      │
                                  └─────────────────────┘
```

Each slot shows only the item icon with a colored border for rarity.
Hover shows tooltip popup. Click shows action buttons at bottom.

## Animations
- No animations for now (instant show/hide)

## Accessibility
- Focus management: trap focus inside inventory when open
- Keyboard navigation: arrow keys to move between slots
- Screen reader: announce item name, stats, and actions
- High contrast mode: ensure borders and text are visible

## Edge Cases
1. **Inventory full on pickup**: 
   - Show "Inventory Full" message
   - Item stays on floor
   - Player can still move onto the tile

2. **Using item consumes turn**:
   - Using any item (consumable) counts as player's action
   - Turn increments and enemies move after

3. **Item effects that exceed max stats**:
   - Healing clamped to maxHp (no message)
   - MP restore clamped to maxMp (no message)
   - Item is consumed regardless

4. **Multiple items with same ability**:
   - Only one instance of ability granted (no duplicates in ability bar)

## Testing Strategy

### Unit Tests
- Item stat bonus calculation
- Inventory add/remove logic
- Slot index validation (0-24)
- Consumable effect application
- Full inventory rejection

### Component Tests
- Inventory toggle (open/close)
- Item selection and action menu
- Keyboard navigation through slots
- Tooltip display on hover
- Use/destroy actions

### E2E Tests (Playwright)
- Pick up item from floor → appears in inventory
- Use consumable → HP/MP increases, item removed, turn increments
- Destroy item → inventory slot empty
- Open inventory with `I` key → panel visible
- Close with ESC or X button → panel hidden
- Full inventory → cannot pick up new item, shows message

## Implementation Checklist
- [ ] Create `InventoryItem` type in `src/game/types.ts`
- [ ] Create `src/data/items.json` with item definitions
- [ ] Add JSON loader utility to parse items at runtime
- [ ] Add inventory state to Zustand store (`inventoryOpen`, `selectedItemSlot`)
- [ ] Add inventory actions (`toggleInventory`, `useItem`, `destroyItem`)
- [ ] Implement passive stat calculation helper in `src/game/inventory.ts`
- [ ] Create `InventoryPanel.tsx` component (side panel with 5×5 grid)
- [ ] Create `InventorySlot.tsx` component (icon only, no text)
- [ ] Create `ItemTooltip.tsx` component (popup on hover with full details)
- [ ] Create `ItemActions.tsx` component (Use/Destroy buttons on click)
- [ ] Add backpack icon button to GameBoard HUD
- [ ] Wire keyboard shortcut (`I` key) to toggle inventory
- [ ] Add item pickup logic to movement system
- [ ] Style with dark theme colors and rarity borders
- [ ] Add unit tests for stat calculation and JSON loading
- [ ] Add component tests for inventory interactions
- [ ] Add E2E test for full pickup/use/destroy flow

## Sample Items (for testing)

### Example Items

```json
{
  "items": [
    {
      "id": "healing-potion",
      "name": "Healing Potion",
      "description": "Restores 20 HP",
      "icon": "🧪",
      "rarity": "common",
      "kind": "consumable",
      "consumable": {
        "healHp": 20
      }
    },
    {
      "id": "iron-plate",
      "name": "Iron Plate",
      "description": "A sturdy piece of metal",
      "icon": "🛡️",
      "rarity": "uncommon",
      "kind": "passive",
      "stats": {
        "armorBonus": 5
      }
    },
    {
      "id": "sharp-blade",
      "name": "Sharp Blade",
      "description": "A well-honed weapon",
      "icon": "🗡️",
      "rarity": "rare",
      "kind": "passive",
      "stats": {
        "weaponDamageBonus": 10
      }
    },
    {
      "id": "mana-crystal",
      "name": "Mana Crystal",
      "description": "Pulsing with arcane energy",
      "icon": "💎",
      "rarity": "epic",
      "kind": "passive",
      "stats": {
        "mpBonus": 15,
        "spellDamageBonus": 5
      }
    }
  ]
}
```

## Future Enhancements
- Drag-and-drop to rearrange items
- Item comparison tooltip (compare two items)
- Quick-use slots (hotbar for consumables)
- Item crafting/combining system
- Item filtering/sorting (by rarity, type)
- Inventory weight/capacity system (currently flat 25 limit)
- Item durability for weapons/armor
- Set bonuses (wearing multiple items from same set)

## API Surface (suggested)

```typescript
// src/game/inventory.ts
export function addItem(inventory: (InventoryItem | null)[], item: InventoryItem): (InventoryItem | null)[] | null;
export function removeItem(inventory: (InventoryItem | null)[], slotIndex: number): (InventoryItem | null)[];
export function useItem(player: Player, slotIndex: number): { player: Player; inventory: (InventoryItem | null)[] };
export function calculateStats(baseStats: PlayerStats, inventory: (InventoryItem | null)[]): PlayerStats;
export function getItemAt(inventory: (InventoryItem | null)[], slotIndex: number): InventoryItem | null;
export function getFirstEmptySlot(inventory: (InventoryItem | null)[]): number | null;

// src/data/itemLoader.ts
export function loadItems(): Promise<InventoryItem[]>;
export function getItemById(id: string): InventoryItem | undefined;
```

---

Next implementation steps:
1. Create inventory types and helper functions
2. Build `InventoryPanel` component with 5×5 layout (right side panel)
3. Wire to Zustand store and keyboard controls
4. Add sample items to floors for testing
5. Implement stat calculation and passive bonuses
6. Add tests for inventory logic
