# Open Tasks

## Recently Completed ✅
- ✅ Map generator (deterministic, seeded, solvable) - `src/game/generator.ts`
- ✅ Movement system (4-directional, collision detection) - `src/game/movement.ts`
- ✅ Game store (Zustand with turn resolution) - `src/store/gameStore.ts`
- ✅ Game board UI (5×5 grid with keyboard controls) - `src/components/GameBoard.tsx`
- ✅ Continuous floor progression (auto-generates on exit)
- ✅ Dark theme (gray-950 bg, bright text colors)
- ✅ Route simplification (game on `/`, removed `/play`)
- ✅ 18 unit tests (all passing: 3 generator + 15 movement)

## High Priority
1. **Combat System**: Implement damage calculation when player collides with enemies
   - Use flat formula: `FinalDamage = max(5, RawAttack - Target.Armor)`
   - See `docs/05-combat.md` for full spec
   - Currently enemy collision is detected but no damage is applied

2. **Enemy AI**: Make enemies move and attack on their turn after player moves
   - Simple chase logic or pathfinding toward player
   - Enemies should move in game store after player action
   - Attack player if adjacent

3. **Ability System**: Create 5 ability slots with MP costs, cooldowns, and targeting
   - Define ability types and effects
   - UI for ability bar (5 slots below inventory count)
   - Handle MP costs and cooldowns per turn

## Medium Priority
4. **Inventory UI**: Build 5×5 grid overlay/modal to display and use items
   - Show player.inventory as 5×5 grid
   - Click/keyboard to use or equip items
   - Display item stats and effects

5. **Item Effects**: Implement stat modifiers, consumables, and passive bonuses
   - Items in inventory act as equipped (passive effects)
   - Consumables for instant HP/MP restoration
   - Stat boost items (+Attack, +Armor, +Speed)

6. **Enemy Variety**: Add different enemy types with varying stats and behaviors
   - Basic melee enemies
   - Ranged enemies that keep distance
   - Tank enemies with high HP/Armor

7. **Boss Encounters**: Special enemies on certain floors with unique mechanics
   - Spawn boss every 5 floors
   - Higher stats and special abilities
   - Special loot on defeat

## Low Priority / Polish
8. **Movement Animations**: Smooth transitions between tiles
9. **Visual Effects**: Particle effects for combat, abilities, and pickups
10. **Sound Design**: Audio feedback for actions and events
11. **Floor Scaling**: Increase difficulty with floor number (enemy stats, spawn rates)
12. **Death Penalties**: More interesting game over mechanics beyond simple restart
13. **Meta Progression**: Unlockable abilities, items, or starting bonuses
14. **Base Starting Presets**: Define 3 character presets with different stat distributions

## Technical Debt
- None currently identified

Add tasks as issues or a project board for tracking.
