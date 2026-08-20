# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Roblox game project using **roblox-ts** (TypeScript for Roblox) and **Flamework** (a TypeScript framework for Roblox game architecture).

## Commands

```bash
# Install dependencies
bun install

# Build (compile TypeScript to Luau)
bun run build

# Watch mode (hot reload during development)
bun run watch

# Lint and format
bun run lint
```

After building, use the Rojo VS Code extension to sync changes to Roblox Studio.

## Architecture

### Directory Structure

```
src/
├── client/           # Client-side code (StarterPlayerScripts)
│   ├── components/   # Client Flamework components
│   ├── controllers/  # Flamework controllers (singletons)
│   └── runtime.client.ts
├── server/           # Server-side code (ServerScriptService)
│   ├── components/   # Server Flamework components
│   ├── services/     # Flamework services (singletons)
│   └── runtime.server.ts
└── shared/           # Shared code (ReplicatedStorage)
    ├── components/   # Shared Flamework components
    └── network.ts    # Flamework networking definitions
```

### Flamework Pattern

- **Services** (`@Service`) - Server-side singletons for **generic, reusable capabilities**
- **Controllers** (`@Controller`) - Client-side singletons for input/UI
- **Components** (`@Component`) - Tag-based behavior attached to instances, **self-contained orchestrators**
- **Networking** - Type-safe RemoteEvents/Functions, **scoped per feature/component**

## Composable Architecture (Core Principle)

This project follows a **composable architecture** pattern. This is the guiding principle for all system design.

### The Pattern

**Components are self-contained orchestrators:**
- A component owns ALL logic for its feature (state management, rules, events, etc.)
- Components reach out to generic services only for capabilities they don't own
- Components should NOT delegate feature logic to feature-specific services

**Services are generic, reusable capabilities:**
- Services should be domain-agnostic (e.g., `TeleportService`, not `LobbyService`)
- A service shouldn't know about specific features that use it
- Services provide "verbs" that any system can use

### Two-Tier Module Design

| Layer | Location | Purpose |
|-------|----------|---------|
| **Core** | `src/shared/core/` | Game-agnostic reusable modules (Health, Inventory, Damageable, ResourceProducer, etc.) |
| **Game** | `src/shared/game/` | Project-specific modules that compose Core modules |

Core modules should never reference Game modules. Game modules compose and extend Core modules for project-specific behavior.

### Example

**❌ Wrong (tightly coupled):**
```
LobbyComponent → LobbyService (lobby-specific)
ShopComponent → ShopService (shop-specific)
QuestComponent → QuestService (quest-specific)
```

**✅ Correct (composable):**
```
LobbyComponent (self-contained)
├── Player tracking, countdown, rules
└── When ready → TeleportService.teleportGroup(players, destination)

ShopComponent (self-contained)
├── UI state, item display, purchase validation
└── When purchasing → CurrencyService.deduct(player, amount)

QuestComponent (self-contained)
├── Progress tracking, completion checks
└── When complete → RewardService.grant(player, rewards)
```

### Benefits

1. **Components are drop-in** - Add the component, it works
2. **Services are reusable** - `TeleportService` works for lobbies, parties, dungeons, etc.
3. **Easier to test** - Mock generic services, test component logic in isolation
4. **Clearer ownership** - "Lobby does lobby things, teleport service teleports"

### Event-Based Communication

Components communicate through events/signals, not direct method calls on each other:

**1. Direct Callbacks (local, same context)**
Use callback functions or signal instances when modules share a context or have a natural parent-child relationship.

**2. Global Event Bus (cross-system, decoupled)**
Use for communication across unrelated systems (e.g., "player died" → UI death screen, scoring system, respawn timer all react independently).

**Rule of thumb:** If you'd need to hunt for a reference just to talk to something, use the event bus instead.

### No Direct State Mutation

Modules expose public methods or raise signals. No module should reach into another module and set its fields directly. This keeps ownership clear and makes networked state easier to reason about.

### Networking Scope

Each feature/component owns its networking:
```typescript
// src/shared/network/lobby.ts - Lobby-specific events
export const LobbyEvents = Networking.createEvent<
  { leave: () => void },
  { playerJoined: (), playerLeft: (), countdown: (seconds: number) => void }
>();
```

NOT a monolithic `network.ts` with all events mixed together.

### Decision Guide

When designing a new system, ask:

| Question | If Yes → |
|----------|----------|
| Is this logic specific to one feature? | Put it in the component |
| Could multiple features use this? | Make it a generic service |
| Does the service name include a feature name? | Rename to be generic |
| Does the component delegate its core logic? | Refactor to be self-contained |

### Runtime Initialization

Both `runtime.client.ts` and `runtime.server.ts` use `Flamework.addPaths()` to register components/services/controllers, then call `Flamework.ignite()` to start.

### Networking Setup

Network events and functions are defined in `src/shared/network.ts` using `Networking.createEvent<>()` and `Networking.createFunction<>()`. Client and server import from `src/client/network.ts` and `src/server/network.ts` respectively to get typed event handlers.

## Local Library Development (Windows + Rojo)

When developing an `@rbxts/*` library locally alongside this project, the standard pattern is to create a directory junction from `node_modules/@rbxts/<lib>/` to the library's repo. Rojo's filesystem watcher is unreliable across junctions (and across cross-directory `$path` references generally), so this project uses the **[rojo-push](https://github.com/StephenSHorton/rojo-push)** fork, which replaces auto-watch with a manual push trigger.

### Setup

Rokit installs the fork automatically — `rokit.toml` pins `rojo = "StephenSHorton/rojo-push@7.7.0-push.4"`. The binary name is still `rojo`, so existing tooling (VS Code Rojo plugin, scripts that shell out to `rojo`) keeps working.

### Workflow

```bash
# Terminal 1 — leave running:
rojo serve --no-watch

# After every library rebuild:
cd ../<lib> && bun run build && cd - && rojo push
# Or just `rojo push` if you're already in this project.
```

`rojo push` re-snapshots the project from disk, computes a diff, and sends it to the Studio plugin via the connection that's already open. No watchers, no restarts, no missed events.

### Project file structure (optional but recommended)

When a library lives outside `node_modules/` (e.g., a sibling repo), point `default.project.json` at the real on-disk path so the project file is explicit about where Rojo should look:

```json
"ReplicatedStorage": {
  "rbxts_include": {
    "$path": "include",
    "node_modules": {
      "$className": "Folder",
      "@rbxts": {
        "$path": "node_modules/@rbxts",
        "<lib>": {
          "$className": "Folder",
          "out": {
            "$path": "../<lib>/out"
          }
        }
      }
    }
  }
}
```

TypeScript still resolves through `node_modules/@rbxts/<lib>` for types; Rojo follows `$path` to the library's real `out/`. This is now an *organisational* choice — with rojo-push, the watcher's junction limitations no longer force you to do this.

## Code Style

- Uses **Biome** for formatting (tabs, double quotes) plus `@rbxts/biome-plugin-roblox-ts` for roblox-ts Grit rules. Plugin paths are listed in `biome.json` (Biome 2.5.9 still resolves `extends` plugin paths relative to the project, not the package). Node helper scripts under `scripts/` have the linter disabled so those Grit rules do not rewrite `child_process.spawn`.
- Uses **ESLint** with `eslint-plugin-roblox-ts` for the type-aware rules Biome plugins cannot express. `tsconfig.json` sets `"types": ["compiler-types", "types"]` so `@rbxts/biome-plugin-roblox-ts` is not picked up as a type package.
- Unused variables should be prefixed with `_`
- JSX uses Roact syntax (`Roact.createElement`)
- **One module per file.** File name matches the primary export.
- **Keep modules small.** If a module is doing two distinct things, split it.

## Charm 0.11

Studio enables `flags.frozen` and `flags.strict` automatically.

- Never mutate a value you just read from an atom. Update through `produce()` / `DataManager.updateData` so the setter receives a new table.
- Do not yield inside `effect()`. `doc.write` is an in-memory Lapis buffer write and must stay sync.
- `peek()` was renamed to `untracked()`.

## Cleanup with Maid

Use `@rbxts/maid` for managing connection cleanup. Never manually track `RBXScriptConnection` objects.

### Pattern for Components/Services

```typescript
import Maid from "@rbxts/maid";

@Component({ tag: "Example" })
export class ExampleComponent extends BaseComponent<Attrs, Model> {
    private readonly maid = new Maid();

    onStart() {
        // Add connections to maid
        this.maid.GiveTask(
            someEvent.Connect(() => { ... })
        );
    }

    destroy() {
        this.maid.DoCleaning();
        super.destroy();
    }
}
```

### Per-Entity Cleanup (e.g., per-player)

When tracking connections for dynamic entities (players, NPCs, etc.), use a Map of Maids:

```typescript
private readonly maid = new Maid();              // Component lifetime
private readonly playerMaids = new Map<Player, Maid>();  // Per-player

private onPlayerJoin(player: Player) {
    const playerMaid = new Maid();
    this.playerMaids.set(player, playerMaid);

    playerMaid.GiveTask(
        player.CharacterRemoving.Connect(() => { ... })
    );
}

private onPlayerLeave(player: Player) {
    const playerMaid = this.playerMaids.get(player);
    if (playerMaid) {
        playerMaid.DoCleaning();
        this.playerMaids.delete(player);
    }
}

destroy() {
    for (const [_, playerMaid] of this.playerMaids) {
        playerMaid.DoCleaning();
    }
    this.maid.DoCleaning();
    super.destroy();
}
```

### In Roact Components

```typescript
useEffect(() => {
    const maid = new Maid();

    maid.GiveTask(Events.something.connect(() => { ... }));

    return () => maid.DoCleaning();
}, []);
```
