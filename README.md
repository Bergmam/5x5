# 5x5

## High-level Summary
This document captures the updated design outline for "5x5", a web-based, 2D roguelike RPG built around the motif of 25-tile modules. This revision enforces that all stats and numeric values are always multiples of 5, simplifies combat to flat deterministic damage values, defines core stats and abilities, and clarifies inventory/ability behavior.

## Core Concepts
- Title / Theme: "5x5"
- Platform: Web (browser)
- Perspective: 2D, top-down
- Primary playfield: a 5×5 tile grid (one 25-tile module) representing a dungeon floor
- Core motif: all UI/components are in 25-tile modules (5×5)

## Stats (all values are multiples of 5)
- Health (HP) — must be 5, 10, 15, ...
- Mana (MP) — must be 5, 10, 15, ...
- Weapon Damage — must be 5, 10, 15, ...
- Spell Damage — must be 5, 10, 15, ...
- Armor — must be 5, 10, 15, ...

Important: All stats and numeric values are always represented as multiples of 5. The game design, UI, and all data tables will only use these allowed values.

## Abilities & Inventory interaction
- Inventory is a single 5×5 grid (25 slots). No stacking.
- Passive items provide their stat bonuses while present anywhere in the inventory (no equipment sheet).
- Some items grant active abilities when carried (ability appears in ability slots while the item is in inventory).
- Ability slots:
  - Player starts with 5 ability slots available.
  - Certain relics (when present in inventory) unlock 5 additional ability slots (total 10).
  - Abilities can be "spell-like" (consume mana) or "activated item abilities" (consumable or reusable per item rules).
- All mana costs and ability effects are multiples of 5.

## Combat: Deterministic, flat multiples-of-5 damage
- Combat contains no RNG. Every attack, mitigation, and effect resolves deterministically.
- Damage values are flat multiples of 5 (5, 10, 15, ...), with minimum damage of 5 on any successful damaging action.
- Resolution order:
  - Player takes an action (move, attack, cast, use item, activate ability).
  - After the player's action resolves, every enemy on the floor takes one action.
  - All effects (damage, heals, triggers) apply immediately and deterministically.

### Damage rules (simple and flat)
- When a unit performs a physical attack (weapon-based), the raw attack value is exactly the attacker's Weapon Damage stat (must be a multiple of 5).
- When a unit casts a damaging spell, the raw attack value is exactly the caster's Spell Damage stat (must be a multiple of 5).
- Armor reduces incoming damage by its full Armor stat (flat subtraction).
- FinalDamage = max(5, RawAttack - Target.Armor)
  - All inputs and outputs are multiples of 5, so FinalDamage will be 5, 10, 15, ...
  - This guarantees a minimum impact from any attack while keeping math extremely simple.

Examples:
- Attacker WeaponDamage = 15, Defender Armor = 5:
  - RawAttack = 15
  - FinalDamage = max(5, 15 - 5) = 10
- Caster SpellDamage = 20, Defender Armor = 10:
  - RawAttack = 20
  - FinalDamage = max(5, 20 - 10) = 10
- Attacker WeaponDamage = 10, Defender Armor = 15:
  - RawAttack = 10
  - RawAttack - Armor = -5 -> FinalDamage = max(5, -5) = 5

### Healing & Mana
- Healing values are multiples of 5.
- Mana costs for spells are multiples of 5.
- An ability that requires MP can only be activated if the player has at least the required MP (both are multiples of 5). Activating deducts the mana cost immediately.

## Items & Rarity
- Item rarities: Common, Uncommon, Rare, Epic.
- Items found in-floor can be:
  - Activated consumables (single-use; use consumes a turn).
  - Passive items (provide stat bonuses while in inventory).
  - Items that grant active abilities while carried.
  - Relics (special passive items that can unlock extra ability slots or provide unique effects).
- All stat bonuses provided by items are multiples of 5 and must obey the same constraint.

## Ability types & activation
- Ability types:
  - Weapon-augmented active: deals damage equal to Weapon Damage stat (flat rule above).
  - Spell-augmented active: deals damage/heal/effect equal to Spell Damage stat (flat rule above) and may consume Mana.
  - Item-activated: single-use effects (consumed on use).
- Activating an ability consumes one turn. If the ability requires mana, mana is deducted (multiple of 5).
- Abilities that require target or area selection are deterministic in effect (no RNG in hit or damage).

## Enemy & Boss rules
- Enemy behavior: stationary, random-wander (within 5×5), patrol, pursuit.
- Boss placement:
  - Designers can place bosses deterministically on specific floors.
  - Designers can choose "one of these X bosses on floor Y" (pool selection) to allow controlled variety; pool selection is a content-level randomization but not combat RNG.
- Enemy stats follow the same multiples-of-5 rule. Enemy damage calculations use the flat damage rules above.

## Progression & Unlocks
- No character classes.
- Between runs, players can unlock starting presets (starting stats and starting items). Each preset uses multiples-of-5 values.
- Relics unlocked or obtained during runs can affect the next runs by providing new starting options or by being possible pool drops.
- Persistent data (unlocks, presets) stored in browser local storage initially; server sync optional later.

## Map & UI (reminders)
- Floor is a single 5×5 module; generators must ensure an entrance and exit are present and that the floor layout is solvable.
- Inventory is 5×5 (25 slots) and is central to decisions (passive items in inventory are effectively "equipped").
- Every UI element should be designed as 25-tile modules or whole compositions of such modules.

## Balancing & Tuning notes
- Because values are constrained to multiples of 5, tuning will proceed in steps of 5.
- Enemy/weapon/spell/item scaling per floor should be expressed in increments of 5 (e.g., WeaponDamage increases by +5 every N floors).
- For clarity and reproducible balancing, all stat tables and spawn budgets will use allowed multiples-of-5 values.

## Open design tasks (suggested next steps)
- Define initial base stat values and example starting presets (all multiples of 5).
- Produce a small set of sample abilities (5 starter abilities) with deterministic effects and mana costs (multiples of 5).
- Draft per-floor scaling tables for enemy stats, spawn budgets, and item rarities using increments of 5.

## Split docs
This README has been split into topic-specific files under the `docs/` folder for easier editing and navigation. The original content remains here; for detailed, focused sections see:

- `docs/01-overview.md` — Project overview and goals
- `docs/02-core-concepts.md` — Core gameplay motifs and constraints
- `docs/03-stats.md` — Stat system and the multiples-of-5 rule
- `docs/04-abilities-inventory.md` — Inventory rules and ability interactions
- `docs/05-combat.md` — Deterministic combat rules and damage formula
- `docs/06-items-rarity.md` — Item types and rarity tiers
- `docs/07-enemies-bosses.md` — Enemy behaviours and boss placement rules
- `docs/08-progression-unlocks.md` — Progression, presets, and persistence
- `docs/09-map-ui.md` — Map, UI, and 5×5 module rules
- `docs/10-balancing-tuning.md` — Balancing, tuning, and scaling notes
- `docs/11-open-tasks.md` — Open design tasks and suggested next steps
- `docs/12-tech-stack.md` — Implementation plan and tech stack (Vite, React, TypeScript, Zustand)
- `docs/13-generator.md` — Map generation algorithms and templates
- `docs/14-state-architecture.md` — **State management slice architecture and patterns**
- `docs/15-inventory-ui.md` — Inventory UI implementation details

If you'd like any of the topic files split further, renamed, or moved into subfolders, tell me which ones and I'll update them.
