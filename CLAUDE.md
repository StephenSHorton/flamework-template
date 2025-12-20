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

- **Services** (`@Service`) - Server-side singletons for game logic
- **Controllers** (`@Controller`) - Client-side singletons for input/UI
- **Components** (`@Component`) - Tag-based behavior attached to instances
- **Networking** - Type-safe RemoteEvents/Functions defined in `src/shared/network.ts`

### Runtime Initialization

Both `runtime.client.ts` and `runtime.server.ts` use `Flamework.addPaths()` to register components/services/controllers, then call `Flamework.ignite()` to start.

### Networking Setup

Network events and functions are defined in `src/shared/network.ts` using `Networking.createEvent<>()` and `Networking.createFunction<>()`. Client and server import from `src/client/network.ts` and `src/server/network.ts` respectively to get typed event handlers.

## Code Style

- Uses **Biome** for formatting (tabs, double quotes)
- Uses **ESLint** with roblox-ts plugin for linting
- Unused variables should be prefixed with `_`
- JSX uses Roact syntax (`Roact.createElement`)
