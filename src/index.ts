export { mockServerPlugin as default } from './plugin'
export { mockServerPlugin } from './plugin'

// Types
export type {
  FallbackOptions,
  LoggerOptions,
  MockFileExport,
  MockServerPluginOptions,
  ResolvedOptions
} from './types'

// Re-export commonly used APIs from better-mock-server
export {
  defineMiddleware,
  definePlugin,
  defineRoutes
} from 'better-mock-server'
