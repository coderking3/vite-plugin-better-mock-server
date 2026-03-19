import type { Middlewares, Plugins, Routes } from 'better-mock-server'

export interface MockServerPluginOptions {
  /** Directory containing mock files, relative to project root. Default: 'mock' */
  mockDir?: string
  /** Glob patterns for mock files within mockDir. Default: ['**\/*.ts', '**\/*.js'] */
  include?: string[]
  /** Glob patterns to exclude from mock file scanning */
  exclude?: string[]

  /** Inline route definitions */
  routes?: Routes
  /** Inline middleware definitions */
  middlewares?: Middlewares
  /** Inline plugin definitions */
  plugins?: Plugins

  /** Enable/disable the plugin. Default: true */
  enabled?: boolean | (() => boolean)
  /** API prefix to match, e.g. '/api'. Only requests starting with this prefix will be intercepted */
  prefix?: string
  /** Enable request logging. Default: true */
  logger?: boolean | LoggerOptions

  /** Proxy fallback for unmatched routes */
  fallback?: FallbackOptions
}

export interface LoggerOptions {
  /** Log matched mock requests. Default: true */
  request?: boolean
  /** Log fallback/proxy requests. Default: true */
  fallback?: boolean
}

export interface FallbackOptions {
  /** Target URL for proxying unmatched requests, e.g. 'http://localhost:8080' */
  target: string
  /** Change the origin of the host header to the target URL. Default: true */
  changeOrigin?: boolean
}

/** Shape of exports from a mock file */
export interface MockFileExport {
  /** Route definitions (default export) */
  default: Routes
  /** Optional middleware definitions */
  middlewares?: Middlewares
  /** Optional plugin definitions */
  plugins?: Plugins
}

export interface ResolvedOptions {
  mockDir: string
  include: string[]
  exclude: string[]
  routes: Routes
  middlewares: Middlewares
  plugins: Plugins
  enabled: boolean | (() => boolean)
  prefix: string
  logger: boolean | LoggerOptions
  fallback: FallbackOptions | undefined
}
