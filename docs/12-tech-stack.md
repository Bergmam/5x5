# Implementation plan & recommended tech stack

This document captures a recommended, modern TypeScript + React toolchain and an implementation plan for the 25 Tiles project. It focuses on tools that are widely-adopted, fast to iterate with, and well-suited to a browser-first 2D roguelike.

## Goals / contract
- Language: TypeScript (strict-mode enabled).
- UI: React (component-based, testable, large ecosystem).
- Fast local development and builds; easy to deploy to static hosts (Vercel, Netlify).
- Reliable test and CI pipeline with linting and formatting.

## Recommended core stack
- Node.js (LTS) — runtime for tooling.
- pnpm — fast, deterministic package manager (preferred). We will NOT use `bun` for the initial scaffold to keep maximum ecosystem compatibility.
- Vite — dev server + build tool (works great with React + TypeScript).
- React (latest stable) + React DOM.
- TypeScript — with `strict: true` and incremental builds.

Why Vite + pnpm: extremely fast cold-starts, incremental builds, and a small DX friction.

## Developer tooling
- ESLint (TypeScript rules via `@typescript-eslint`) — enforce code quality.
- Prettier — code formatter; run via `lint-staged` on commit.
- Husky + lint-staged — pre-commit hooks for formatting and linting.
- Vitest + @testing-library/react — unit and component testing (fast, integrated with Vite).
- Playwright (or Cypress) — end-to-end tests for interaction flows and the floor generator.
- Storybook (optional) — component explorer for UI and ability item cards.

## Routing

- Router: React Router (v6) — chosen for stability, nested routes, and ecosystem support.
- Router mode: BrowserRouter — produces clean URLs (e.g. `/play/floor/1`). When deploying to static hosts make sure to configure the host to rewrite unknown routes to `index.html` (Vercel/Netlify do this automatically). If you prefer no host rewrites, consider `HashRouter` instead.

Integration notes:
- Keep pure game logic in `/src/game`. The router should only determine which UI views mount. Use lazy loading for heavy screens and implement small route guards that read from Zustand for redirecting when requirements aren't met.

## State & data
- Local runtime state: Zustand — lightweight, serializable store (chosen for this project). Keep `game` logic in a framework-agnostic module and surface a thin adapter to Zustand for UI wiring.
- Persisted state between runs: browser `localStorage` for unlocks/presets; abstract behind a `storage` service for future server sync.
- **Architecture**: State management uses a **slice pattern** to organize concerns. See [14-state-architecture.md](./14-state-architecture.md) for detailed documentation on the slice architecture, how slices communicate, and how to create new slices.

## Styling
- Tailwind CSS (utility-first) for fast layout and prototyping, or CSS modules for stricter scoping.
- PostCSS for small transformations (optional).

## Project layout (suggested)

```
/src
  /app                 # App bootstrap (main.tsx, App.tsx, routes)
  /game                # Pure game logic (deterministic rules, damage calc, generator)
    /rules
    /entities
    /generator
    /types
  /ui                  # React components (presentational)
  /store               # Zustand state management
    /slices            # Modular slices (shop, combat, inventory, movement)
    gameStore.ts       # Main store orchestration
  /services            # storage, persistence, sample data loaders
  /assets              # images, sprites, tiles
  /tests               # unit/integration tests
  /stories             # Storybook stories (optional)

vite.config.ts
tsconfig.json
package.json
README.md
```

Engineering notes:
- Keep the game logic in `/src/game` and keep it framework-agnostic so it can be tested without React.
- The UI should call into the game layer with a thin adapter; this keeps deterministic rules easy to unit test.
- State management uses a **slice pattern** - see `src/store/slices/` for examples of how to organize different concerns (shop, combat, inventory, movement).

## CI / repository hygiene
- GitHub Actions (or equivalent) with the following jobs:
  - install (pnpm install)
  - lint
  - typecheck
  - unit tests (vitest)
  - e2e (Playwright) — optional on schedule or PR with label
- Enforce PRs via branch protection rules and require passing checks.

## Deployment
- Static hosting: Vercel or Netlify for quick previews and production deployment.
- Alternative: host on GitHub Pages for docs/site and use Vercel for the app.

## Testing plan
- Unit tests for all pure functions in `/src/game` (damage calc, ability resolution, item stacking rules).
- Component tests for UI using `@testing-library/react`.
- E2E tests for critical flows: a small solvable 5×5 floor generation, pick up an item, use an ability, complete a floor.

## Example bootstrap commands

Run these from the repository root to scaffold a Vite + React + TypeScript project (recommended using `pnpm`).

```bash
# install pnpm if you don't have it
npm install -g pnpm

# create a Vite + React + TS app interactively (accept defaults or pass flags)
pnpm create vite@latest web -- --template react-ts

cd web
pnpm install

# add common tools
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier husky lint-staged vitest @testing-library/react playwright tailwindcss postcss autoprefixer

# initialize Tailwind
pnpm exec tailwindcss init -p

# run dev
pnpm dev
```

Note: the commands above are a starting point; if you prefer `npm` or `yarn`, substitute accordingly.

## Optional / advanced
- Monorepo: Turborepo or pnpm workspaces if you want to split `game` logic, `ui`, and `editor` into packages.
- WASM: If you later need highly-optimized pathfinding, consider a small WASM module, but keep the initial implementation JS/TS-first.

## Next steps I can take for you
- ✅ Created Vite + React + TypeScript scaffold with ESLint/Prettier/Vitest
- ✅ Added test-covered implementation of generator and movement system
- ✅ Implemented Zustand game store with continuous floor progression
- ✅ Refactored game store into modular slices (shop, combat, inventory, movement)
- ✅ Built GameBoard UI component with keyboard controls (Arrow keys + WASD)
- ✅ Applied dark theme (gray-950 background, bright 400-variant colors)
- ✅ Configured routing with game on `/` and editor on `/editor`

## Implementation Status

### ✅ Completed
- TypeScript strict mode with Vite 5.4.21
- React 18+ with functional components
- pnpm package management
- **Zustand state management with slice architecture** (see [14-state-architecture.md](./14-state-architecture.md))
  - Shop slice (132 lines) - economy & transactions
  - Combat slice (163 lines) - combat mechanics & enemy AI
  - Inventory slice (101 lines) - inventory management
  - Movement slice (153 lines) - player movement & interactions
  - Main store (292 lines) - orchestration & game lifecycle
- React Router v6 with clean URLs
- Tailwind CSS with dark theme
- Vitest testing (152/152 passing)
- Deterministic map generator with seeded RNG
- Movement system with collision detection
- Continuous floor progression (auto-generates next floor on exit)
- Dark UI theme with bright text for visibility
- Shop system with gold economy
- Combat system with damage calculation

### 🚧 Pending
- Advanced enemy AI behaviors
- More abilities (currently has 3: Fireball, Shockwave, Teleport)
- Movement animations
- Floor difficulty scaling
- Additional item types and rarities

### Key Architecture Decisions
- **Dark Theme**: gray-950 background, gray-900 panels, gray-800 floor tiles, bright 400-variant colors (cyan-400 player, red-400 enemies, etc.)
- **No /play route**: Game loads directly on `/` for immediate play
- **Continuous progression**: No modal on exit, auto-generates next floor
- **Keyboard controls**: Arrow keys + WASD for movement
- **Game structure**: Pure game logic in `/src/game`, UI in `/src/components`, state in `/src/store`
- **Slice Architecture**: State organized into focused modules (shop, combat, inventory, movement) - see [14-state-architecture.md](./14-state-architecture.md) for details

If you'd like me to scaffold the project now, tell me which package manager you prefer (`pnpm` recommended) and whether you want Tailwind and Playwright included by default.
