# vite-plugin-better-mock-server

[![npm version](https://img.shields.io/npm/v/vite-plugin-better-mock-server)](https://www.npmjs.com/package/vite-plugin-better-mock-server)
[![license](https://img.shields.io/npm/l/vite-plugin-better-mock-server)](https://github.com/coderking3/vite-plugin-better-mock-server/blob/main/LICENSE)

一个将 [better-mock-server](https://github.com/OpenKnights/better-mock-server) 集成到 Vite 开发服务器的插件，支持基于文件的 Mock 路由定义和热更新。

[English](./README.md) | [中文](./README_zh.md)

## 特性

- 基于文件的 Mock 路由定义，完整支持 TypeScript
- 热更新 — 修改 Mock 文件后即时生效，无需重启开发服务器
- 完整的 [h3](https://h3.dev) API 支持（`readBody`、`getQuery`、`getRouterParam` 等）
- 可配置的 API 前缀匹配
- 未匹配路由的代理回退
- 支持 better-mock-server 的中间件和插件
- 兼容 Vite 5 和 Vite 6

## 安装

```bash
# pnpm
pnpm add -D vite-plugin-better-mock-server better-mock-server

# npm
npm install -D vite-plugin-better-mock-server better-mock-server

# yarn
yarn add -D vite-plugin-better-mock-server better-mock-server
```

## 快速开始

### 1. 配置插件

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

### 2. 创建 Mock 文件

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

### 3. 启动开发服务器

```bash
pnpm dev
```

现在 `GET /api/users` 和 `POST /api/users` 会被 Mock 服务器拦截。

## 使用 h3 API

better-mock-server 基于 [h3](https://h3.dev) 构建，你可以在路由处理器中直接使用 h3 的工具函数：

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

## 配置项

| 选项          | 类型                       | 默认值                   | 说明                            |
| ------------- | -------------------------- | ------------------------ | ------------------------------- |
| `mockDir`     | `string`                   | `'mock'`                 | Mock 文件目录，相对于项目根目录 |
| `include`     | `string[]`                 | `['**/*.ts', '**/*.js']` | Mock 文件的 glob 匹配模式       |
| `exclude`     | `string[]`                 | `[]`                     | 排除的 glob 匹配模式            |
| `prefix`      | `string`                   | `''`                     | API 前缀匹配（如 `'/api'`）     |
| `enabled`     | `boolean \| () => boolean` | `true`                   | 启用/禁用插件                   |
| `logger`      | `boolean \| LoggerOptions` | `true`                   | 启用请求日志                    |
| `routes`      | `Routes`                   | `{}`                     | 内联路由定义                    |
| `middlewares` | `Middlewares`              | `[]`                     | 内联中间件定义                  |
| `plugins`     | `Plugins`                  | `[]`                     | 内联插件定义                    |
| `fallback`    | `FallbackOptions`          | `undefined`              | 未匹配路由的代理回退配置        |

### FallbackOptions

| 选项           | 类型      | 默认值 | 说明                                         |
| -------------- | --------- | ------ | -------------------------------------------- |
| `target`       | `string`  | -      | 代理目标地址（如 `'http://localhost:8080'`） |
| `changeOrigin` | `boolean` | `true` | 将请求头中的 host 修改为目标地址             |

### LoggerOptions

| 选项       | 类型      | 默认值 | 说明                     |
| ---------- | --------- | ------ | ------------------------ |
| `request`  | `boolean` | `true` | 记录匹配的 Mock 请求日志 |
| `fallback` | `boolean` | `true` | 记录回退/代理请求日志    |

## Mock 文件格式

Mock 文件通过 `defineRoutes()` 默认导出路由，也可以导出 `middlewares` 和 `plugins`：

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
      // 中间件逻辑
    }
  })
]
```

## 代理回退

当请求匹配了前缀但没有匹配到任何 Mock 路由时，可以将其代理到真实后端：

```ts
mockServer({
  prefix: '/api',
  fallback: {
    target: 'http://localhost:8080',
    changeOrigin: true
  }
})
```

## 许可证

[MIT](./LICENSE)
