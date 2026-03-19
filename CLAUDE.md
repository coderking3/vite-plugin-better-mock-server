# CLAUDE.md — vite-plugin-better-mock-server

## Project Overview

A Vite development plugin that integrates [better-mock-server](../better-mock-server) into the Vite dev server, enabling file-based mock route definitions with hot-reload support.

## Tech Stack

- **Language**: TypeScript (strict mode, ESNext target)
- **Core Dependencies**: better-mock-server (peer), picocolors, tinyglobby
- **Peer Dependencies**: vite ^5.0.0 || ^6.0.0, better-mock-server ^1.4.0
- **Build**: tsdown (outputs ESM + CJS + d.ts to `dist/`)
- **Test**: vitest
- **Lint**: eslint (`@king-3/eslint-config`)
- **Format**: prettier (`@king-3/prettier-config`)
- **Package**: ESM-first (`"type": "module"`), dual format exports

## Commands

- `pnpm test` — Run tests (vitest)
- `pnpm test:watch` — Run tests in watch mode
- `pnpm build` — Build via `tsx scripts/build.ts` (runs tsdown + post-build file renames)
- `pnpm lint` / `pnpm lint:fix` — Lint
- `pnpm format` — Format with prettier
- `pnpm play` — Run playground demo with Vite
- `pnpm release` — Version bump via bumpp

## Project Structure

```
src/
  index.ts        — Public API exports (plugin + re-exports from better-mock-server)
  plugin.ts       — Vite plugin implementation (configureServer, file watcher, hot-reload)
  middleware.ts   — Connect middleware: request interception, Web Request conversion, response streaming
  scanner.ts      — Mock file scanning (tinyglobby), loading (Vite SSR), module merging
  types.ts        — TypeScript type definitions (options, resolved options, mock file export)
  utils.ts        — resolveOptions(), normalizePrefix(), isEnabled(), stripPrefix(), matchesPrefix()
  logger.ts       — Colored console logger (picocolors)
  fallback.ts     — Proxy fallback for unmatched routes
scripts/
  build.ts        — Custom build script (tsdown + post-build file renames)
test/             — Vitest test files (middleware, scanner, utils)
playground/       — Example Vite project with mock files
```

## Architecture

### Request Flow

```
HTTP Request → Vite Dev Server → Connect Middleware → Web Request Conversion → H3 App (better-mock-server) → Response Stream Back
```

### Plugin Lifecycle

1. `configResolved` — Capture project root and mock directory path
2. `configureServer` — Scan mock files → load via Vite SSR → merge modules → create H3 app → inject middleware → set up file watcher

### Hot-Reload

- Watches mock directory for `change`, `add`, `unlink` events (registered via loop)
- 100ms debounce before rebuilding
- Invalidates Vite module graph → rebuilds H3 app from scratch
- Debounce timer is cleaned up on server close

### Mock File Format

Mock files export routes as default, with optional middlewares and plugins:

```ts
import { defineRoutes } from 'vite-plugin-better-mock-server'

export default defineRoutes({
  '/users': {
    GET: () => [{ id: 1, name: 'Alice' }],
    POST: (event) => ({ message: 'Created' })
  }
})

export const middlewares = [] // optional
export const plugins = [] // optional
```

### Module Merging Strategy

- **Routes**: file routes override inline routes (same key)
- **Middlewares**: inline first, then file-level (concatenated)
- **Plugins**: concatenated

## Coding Style

- Use `type` imports for type-only imports (`import type ...`)
- Prefer functional style; avoid classes
- Keep modules small and focused on a single responsibility
- Re-export `defineRoutes`, `defineMiddleware`, `definePlugin` from better-mock-server for user convenience
- Plugin only applies during `'serve'` mode (dev server)

## Key Design Decisions

- Uses Vite's `ssrLoadModule()` to load mock files — ensures proper TS transforms and module resolution
- Mock modules are loaded in parallel via `Promise.allSettled` for faster startup
- Converts Node.js IncomingMessage to Web standard Request via `Readable.toWeb()` for H3 compatibility
- Streams response body back via ReadableStream
- 404 from H3 triggers fallback proxy (if configured) or passes to next middleware

## Git Workflow

- Main branch: `main`
- Commit messages: use conventional commits with emoji prefixes
