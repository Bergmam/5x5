# Map & UI

- Each floor is a single solvable 5×5 module with entrance and exit.
- Inventory is 5×5 and central to strategy (passive items act as equipped).
- UI should be composed of 25-tile modules or full compositions of such modules.

## UI Theme
- Dark theme with bright text for classic roguelike aesthetic
- Background: near-black (gray-950)
- Game board: dark gray-800 floor tiles with gray-950 walls
- Text: bright colors (cyan-400 for player, red-400 for enemies, etc.)
- HUD: displays Floor number, Turn count, HP, MP, and Inventory count
- All stats and values are multiples of 5

## Routing & Navigation
- Main game accessible at `/` (root route)
- `/editor` route for floor editor/generator testing
- Game starts with a "Start New Game" button
- No separate landing page - game UI loads immediately

## Floor Progression
- Reaching the exit automatically generates the next floor
- Player stats (HP, MP, inventory) persist between floors
- Player position resets to new entrance
- Floor number increments and displays in HUD
- Death triggers game over modal with restart option

Map generation & data model:
- See `docs/13-generator.md` for the full implementation plan for the deterministic, seeded 5×5 floor generator, data types, placement heuristics, and testing strategy.
