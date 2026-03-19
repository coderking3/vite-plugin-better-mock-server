import type { App } from 'better-mock-server'
import type { Plugin, ViteDevServer } from 'vite'

import type { MockServerPluginOptions } from './types'

import { resolve } from 'node:path'

import { createApp } from 'better-mock-server'

import { createLogger } from './logger'
import { createMockMiddleware } from './middleware'
import {
  getMockFileRelativePath,
  loadMockModules,
  mergeMockModules,
  scanMockFiles
} from './scanner'
import { isEnabled, resolveOptions } from './utils'

export function mockServerPlugin(
  options: MockServerPluginOptions = {}
): Plugin {
  const resolved = resolveOptions(options)
  let app: App
  let root: string
  let mockDirAbsolute: string

  return {
    name: 'vite-plugin-better-mock-server',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      mockDirAbsolute = resolve(root, resolved.mockDir)
    },

    async configureServer(server) {
      if (!isEnabled(resolved.enabled)) return

      const logger = createLogger(resolved.logger)

      // Initial scan and build
      app = await buildMockApp(server, resolved, root)

      // Inject connect middleware
      const middleware = createMockMiddleware({
        getApp: () => app,
        options: resolved,
        logger
      })

      server.middlewares.use(middleware)

      // Watch mock directory for changes
      server.watcher.add(mockDirAbsolute)

      let debounceTimer: ReturnType<typeof setTimeout> | undefined

      for (const event of ['change', 'add', 'unlink'] as const) {
        server.watcher.on(event, (file) => {
          if (!isMockFile(file, mockDirAbsolute)) return
          handleMockFileChange(file, event)
        })
      }

      server.httpServer?.on('close', () => clearTimeout(debounceTimer))

      function handleMockFileChange(file: string, _type: string) {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
          try {
            // Invalidate the module in Vite's module graph
            const mod = server.moduleGraph.getModuleById(file)
            if (mod) {
              server.moduleGraph.invalidateModule(mod)
            }

            // Rebuild the h3 app
            app = await buildMockApp(server, resolved, root)
            const relPath = getMockFileRelativePath(file, root)
            logger.reload(relPath)
          } catch (err) {
            logger.error('Failed to reload mock files', err)
          }
        }, 100)
      }
    }
  }
}

async function buildMockApp(
  server: ViteDevServer,
  options: ReturnType<typeof resolveOptions>,
  root: string
): Promise<App> {
  const files = await scanMockFiles(root, options)
  const modules = await loadMockModules(files, server)
  const { routes, middlewares, plugins } = mergeMockModules(modules, options)

  return createApp({ routes, middlewares, plugins })
}

function isMockFile(file: string, mockDirAbsolute: string): boolean {
  return file.startsWith(mockDirAbsolute)
}
