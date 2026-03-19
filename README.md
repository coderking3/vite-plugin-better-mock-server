# vite-plugin-better-mock-server

[![npm version](https://img.shields.io/npm/v/vite-plugin-better-mock-server)](https://www.npmjs.com/package/vite-plugin-better-mock-server)
[![license](https://img.shields.io/npm/l/vite-plugin-better-mock-server)](https://github.com/coderking3/vite-plugin-better-mock-server/blob/main/LICENSE)

A Vite plugin that integrates [better-mock-server](https://github.com/OpenKnights/better-mock-server) into the Vite dev server, enabling file-based mock route definitions with hot-reload support.

[English](./README.md) | [中文](./README_zh.md)

## Features

- File-based mock route definitions with TypeScript support
- Hot-reload — mock files update instantly without restarting the dev server
- Full [h3](https://h3.dev) API support (`readBody`, `getQuery`, `getRouterParam`, etc.)
- Configurable API prefix matching
- Proxy fallback for unmatched routes
- Supports middlewares and plugins from better-mock-server
- Works with Vite 5 and Vite 6

## Install

```bash
# pnpm
pnpm add -D vite-plugin-better-mock-server better-mock-server

# npm
npm install -D vite-plugin-better-mock-server better-mock-server

# yarn
yarn add -D vite-plugin-better-mock-server better-mock-server
```

## Quick Start

### 1. Configure the plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import mockServer from 'vite-plugin-better-mock-server'

export default defineConfig({
  plugins: [
    mockServer({
      mockDir: 'mock',
      prefix: '/api',
      logger: true
    })
  ]
})
```

### 2. Create mock files

```ts
// mock/user.ts
import { defineRoutes } from 'vite-plugin-better-mock-server'

export default defineRoutes({
  '/users': {
    GET: () => [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    POST: (_event) => ({
      id: 3,
      name: 'New User',
      message: 'User created'
    })
  },
  '/users/:id': {
    GET: (event) => ({
      id: event.context.params?.id,
      name: 'Alice',
      email: 'alice@example.com'
    })
  }
})
```

### 3. Start the dev server

```bash
pnpm dev
```

Now `GET /api/users` and `POST /api/users` are intercepted by the mock server.

## Using h3 APIs

Since better-mock-server is built on [h3](https://h3.dev), you can use h3 utilities directly in your route handlers:

```ts
// mock/todos.ts
import { getQuery, getRouterParam, noContent, readBody } from 'h3'
import { defineRoutes } from 'vite-plugin-better-mock-server'

const todos = [
  { id: 1, title: 'Learn h3', completed: true },
  { id: 2, title: 'Build mock server', completed: false }
]
let nextId = 3

export default defineRoutes({
  '/todos': {
    GET: (event) => {
      const query = getQuery(event)
      if (query.completed !== undefined) {
        const completed = query.completed === 'true'
        return todos.filter((t) => t.completed === completed)
      }
      return todos
    },
    POST: async (event) => {
      const body = await readBody<{ title: string }>(event)
      if (!body?.title) {
        event.res.status = 400
        return { error: 'title is required' }
      }
      const todo = { id: nextId++, title: body.title, completed: false }
      todos.push(todo)
      event.res.status = 201
      return todo
    }
  },
  '/todos/:id': {
    GET: (event) => {
      const id = Number(getRouterParam(event, 'id'))
      const todo = todos.find((t) => t.id === id)
      if (!todo) {
        event.res.status = 404
        return { error: 'Todo not found' }
      }
      return todo
    },
    DELETE: (event) => {
      const id = Number(getRouterParam(event, 'id'))
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) {
        event.res.status = 404
        return { error: 'Todo not found' }
      }
      todos.splice(index, 1)
      return noContent()
    }
  }
})
```

## Options

| Option        | Type                       | Default                  | Description                                               |
| ------------- | -------------------------- | ------------------------ | --------------------------------------------------------- |
| `mockDir`     | `string`                   | `'mock'`                 | Directory containing mock files, relative to project root |
| `include`     | `string[]`                 | `['**/*.ts', '**/*.js']` | Glob patterns for mock files                              |
| `exclude`     | `string[]`                 | `[]`                     | Glob patterns to exclude                                  |
| `prefix`      | `string`                   | `''`                     | API prefix to match (e.g. `'/api'`)                       |
| `enabled`     | `boolean \| () => boolean` | `true`                   | Enable/disable the plugin                                 |
| `logger`      | `boolean \| LoggerOptions` | `true`                   | Enable request logging                                    |
| `routes`      | `Routes`                   | `{}`                     | Inline route definitions                                  |
| `middlewares` | `Middlewares`              | `[]`                     | Inline middleware definitions                             |
| `plugins`     | `Plugins`                  | `[]`                     | Inline plugin definitions                                 |
| `fallback`    | `FallbackOptions`          | `undefined`              | Proxy fallback for unmatched routes                       |

### FallbackOptions

| Option         | Type      | Default | Description                                              |
| -------------- | --------- | ------- | -------------------------------------------------------- |
| `target`       | `string`  | -       | Target URL for proxying (e.g. `'http://localhost:8080'`) |
| `changeOrigin` | `boolean` | `true`  | Change the origin of the host header to the target URL   |

### LoggerOptions

| Option     | Type      | Default | Description                 |
| ---------- | --------- | ------- | --------------------------- |
| `request`  | `boolean` | `true`  | Log matched mock requests   |
| `fallback` | `boolean` | `true`  | Log fallback/proxy requests |

## Mock File Format

Mock files should have a default export using `defineRoutes()`. You can also export `middlewares` and `plugins`:

```ts
import { defineMiddleware, defineRoutes } from 'vite-plugin-better-mock-server'

export default defineRoutes({
  '/example': {
    GET: () => ({ message: 'hello' })
  }
})

export const middlewares = [
  defineMiddleware({
    name: 'auth-check',
    handler: (event) => {
      // middleware logic
    }
  })
]
```

## Fallback Proxy

When a request matches the prefix but no mock route is defined, you can proxy it to a real backend:

```ts
mockServer({
  prefix: '/api',
  fallback: {
    target: 'http://localhost:8080',
    changeOrigin: true
  }
})
```

## License

[MIT](./LICENSE)
