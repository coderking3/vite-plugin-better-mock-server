# vite-plugin-better-mock-server 项目指南

## 一、这个插件是做什么的

在 Vite 开发服务器中拦截 HTTP 请求，将匹配的请求交给 mock 路由处理并返回模拟数据，让前端开发不依赖后端接口。

核心能力：

- 在 `mock/` 目录下写 `.ts/.js` 文件定义模拟接口
- 修改 mock 文件后自动热更新，无需重启
- 支持日志输出、404 回退代理

---

## 二、项目结构

```
src/
├── index.ts           入口，导出插件函数和类型
├── plugin.ts          Vite 插件主体（生命周期钩子、文件监听）
├── middleware.ts      Connect 中间件（请求拦截、转发、响应回写）
├── scanner.ts         Mock 文件扫描、加载（并行）、合并
├── types.ts           所有 TypeScript 类型定义
├── utils.ts           工具函数（选项解析、前缀处理）
├── logger.ts          彩色日志输出
└── fallback.ts        404 回退代理

scripts/
└── build.ts           构建脚本（tsdown + 产物文件重命名）

test/                  测试文件
playground/            示例项目
```

---

## 三、整体架构

### 数据流

```
用户请求 (GET /api/users)
    │
    ▼
┌─────────────────────────┐
│   Vite Dev Server       │
│   (Connect 中间件栈)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   middleware.ts          │
│   1. 检查插件是否启用      │
│   2. 匹配 prefix (/api)  │
│   3. 转换为 Web Request   │
│   4. 去掉 prefix 后       │
│      交给 H3 App 处理     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   H3 App                │
│   (better-mock-server)  │
│   路由匹配 → 执行 handler │
└────────┬────────────────┘
         │
         ▼
    ┌────┴────┐
    │ 匹配到？ │
    └────┬────┘
    Yes  │  No
    │    │
    │    ▼
    │  ┌──────────────┐
    │  │ 有 fallback?  │── Yes ──→ 代理到目标服务器
    │  └──────┬───────┘
    │         │ No
    │         ▼
    │     next() 透传给 Vite
    │
    ▼
  流式回写响应 → 输出日志
```

### 启动流程

```
plugin.ts configureServer()
    │
    ├── 1. scanMockFiles()     用 tinyglobby 扫描 mock 目录
    ├── 2. loadMockModules()   用 Vite ssrLoadModule 并行加载所有文件
    ├── 3. mergeMockModules()  合并所有文件的 routes/middlewares/plugins
    ├── 4. createApp()         调用 better-mock-server 创建 H3 应用
    ├── 5. createMockMiddleware() 创建 Connect 中间件注入 Vite
    └── 6. 监听 mock 目录文件变化 → 100ms 防抖 → 重建 H3 App
               （服务器关闭时清理 debounce 定时器）
```

---

## 四、各模块详解

### plugin.ts — 插件主体

Vite 插件的标准结构，只在 `serve`（开发模式）下生效：

```ts
const plugin = {
  name: 'vite-plugin-better-mock-server',
  apply: 'serve',
  configResolved(config) {
    /* 获取项目 root 和 mock 目录绝对路径 */
  },
  configureServer(server) {
    /* 核心逻辑：扫描 → 创建 app → 注入中间件 → 监听文件 */
  }
}
```

文件监听的热更新逻辑：

- 通过循环注册 `change`、`add`、`unlink` 事件监听
- 100ms 防抖，避免频繁重建
- 先让 Vite 的模块图失效（`invalidateModule`），再重建整个 H3 App
- 服务器关闭时自动清理 debounce 定时器

### middleware.ts — 请求处理

核心函数 `createMockMiddleware()` 返回一个 Connect 中间件，处理流程：

1. **前置检查**：插件是否启用、URL 是否匹配 prefix
2. **请求转换**：`toWebRequest()` 把 Node.js `IncomingMessage` → Web `Request`
   - 去掉 prefix（`/api/users` → `/users`），这样 mock 文件里的路由不需要写 prefix
   - 处理请求头和请求体（通过 `Readable.toWeb()` 正确转换 Node stream → Web ReadableStream，`duplex: 'half'`）
3. **H3 处理**：`app.fetch(request)` 交给 better-mock-server
4. **响应回写**：`writeResponse()` 用 `ReadableStream` 流式写回 Node.js `ServerResponse`
5. **404 处理**：路由不匹配时走 fallback 代理或 `next()` 透传

### scanner.ts — 文件扫描与合并

三个阶段：

| 函数                 | 作用                                                                              |
| -------------------- | --------------------------------------------------------------------------------- |
| `scanMockFiles()`    | 用 tinyglobby 按 include/exclude 规则扫描 mock 目录                               |
| `loadMockModules()`  | 用 `server.ssrLoadModule()` 并行加载文件（`Promise.allSettled`），支持 TypeScript |
| `mergeMockModules()` | 将多文件 + 内联配置合并为一份 routes/middlewares/plugins                          |

合并策略：

- **routes**：先放 inline，再放文件的（文件覆盖 inline 同名路由）
- **middlewares**：inline 在前，文件在后（顺序拼接）
- **plugins**：顺序拼接

### types.ts — 类型定义

**用户配置** `MockServerPluginOptions`：

| 字段          | 类型                       | 默认值                   | 说明                |
| ------------- | -------------------------- | ------------------------ | ------------------- |
| `mockDir`     | `string`                   | `'mock'`                 | mock 文件目录       |
| `include`     | `string[]`                 | `['**/*.ts', '**/*.js']` | 扫描的 glob 模式    |
| `exclude`     | `string[]`                 | `[]`                     | 排除的 glob 模式    |
| `routes`      | `Routes`                   | `{}`                     | 内联路由定义        |
| `middlewares` | `Middlewares`              | `[]`                     | 内联中间件          |
| `plugins`     | `Plugins`                  | `[]`                     | 内联插件            |
| `enabled`     | `boolean \| () => boolean` | `true`                   | 开关                |
| `prefix`      | `string`                   | `''`                     | 请求前缀，如 `/api` |
| `logger`      | `boolean \| LoggerOptions` | `true`                   | 日志开关            |
| `fallback`    | `FallbackOptions`          | `undefined`              | 回退代理配置        |

**Mock 文件导出** `MockFileExport`：

```ts
export default defineRoutes({}) // 必须：路由
export const middlewares = [] // 可选：中间件
export const plugins = [] // 可选：插件
```

### logger.ts — 日志

用 picocolors 输出彩色日志：

```
[mock] GET     /api/users 200 15ms
[mock] GET     /api/other → fallback
[mock] reloaded: mock/user.ts
```

### fallback.ts — 回退代理

当 mock 路由返回 404 时，把请求原样代理到指定目标服务器：

```ts
const fallbackOptions = {
  target: 'http://localhost:8080', // 后端地址
  changeOrigin: true // 修改 Host 头
}
```

用 Node.js 原生 `http.request` / `https.request` 实现，请求体通过 `pipe` 流式转发。

---

## 五、与 better-mock-server 的关系

```
┌──────────────────────────┐     ┌─────────────────────┐
│ vite-plugin-mock-server  │     │ better-mock-server   │
│                          │     │                      │
│  文件扫描/加载/监听        │     │  createApp()         │
│  Connect 中间件           │────→│  路由注册/匹配/分发    │
│  请求转换 (Node→Web)      │     │  中间件执行           │
│  响应回写 (Web→Node)      │     │  插件系统             │
│  日志/回退代理             │     │  基于 h3 框架         │
└──────────────────────────┘     └─────────────────────┘
```

- 插件**不处理路由匹配和分发**，这些全部交给 better-mock-server（H3）
- 插件负责的是 **Vite 集成层**：文件扫描、模块加载、中间件注入、协议转换、开发体验增强

---

## 六、使用示例

### 基本配置

```ts
// vite.config.ts
import mockServer from 'vite-plugin-better-mock-server'

export default defineConfig({
  plugins: [
    mockServer({
      prefix: '/api'
    })
  ]
})
```

### Mock 文件

```ts
// mock/user.ts
import { defineRoutes } from 'vite-plugin-better-mock-server'

export default defineRoutes({
  '/users': {
    GET: () => [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ],
    POST: (event) => ({ id: 3, message: 'User created' })
  },
  '/users/:id': {
    GET: (event) => ({
      id: event.context.params?.id,
      name: 'Alice'
    }),
    DELETE: (event) => ({
      message: 'User deleted'
    })
  }
})
```

请求 `GET /api/users` → 插件去掉 `/api` 前缀 → H3 匹配 `/users` GET handler → 返回用户列表。

### 带回退代理

```ts
mockServer({
  prefix: '/api',
  fallback: {
    target: 'http://localhost:8080',
    changeOrigin: true
  }
})
```

mock 中定义了的接口返回模拟数据，没定义的自动代理到 `8080` 端口的后端服务。

---

## 七、关键设计决策

1. **用 `ssrLoadModule` 加载 mock 文件** — 复用 Vite 的 TS 编译和模块解析，不需要额外的编译步骤
2. **Node.js → Web Request 转换** — H3 v2 使用 Web 标准 API，通过 `Readable.toWeb()` 将 Node.js stream 正确转换为 Web ReadableStream
3. **去掉 prefix 再匹配** — mock 文件中定义 `/users` 就好，不需要写 `/api/users`，降低心智负担
4. **整个 H3 App 重建** — 文件变化时不做增量更新，直接重建整个 app，实现简单且 mock 场景下性能足够
5. **只在 serve 模式生效** — 生产构建不需要 mock，通过 `apply: 'serve'` 确保零侵入
