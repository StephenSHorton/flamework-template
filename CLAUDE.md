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

## Code Style

- Uses **Biome** for formatting (tabs, double quotes)
- Uses **ESLint** with roblox-ts plugin for linting
- Unused variables should be prefixed with `_`
- JSX uses Roact syntax (`Roact.createElement`)

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
