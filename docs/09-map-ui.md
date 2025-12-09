# Map & UI

- Each floor is a single solvable 5×5 module with entrance and exit.
- Inventory is 5×5 and central to strategy (passive items act as equipped).
- UI should be composed of 25-tile modules or full compositions of such modules.

Map generation & data model:
- See `docs/13-generator.md` for the full implementation plan for the deterministic, seeded 5×5 floor generator, data types, placement heuristics, and testing strategy.
