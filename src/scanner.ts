import type { Middlewares, Plugins, Routes } from 'better-mock-server'
import type { ViteDevServer } from 'vite'

import type { MockFileExport, ResolvedOptions } from './types'

import { posix, relative, resolve } from 'node:path'

import { glob } from 'tinyglobby'

export interface ScanResult {
  routes: Routes
  middlewares: Middlewares
  plugins: Plugins
}

export async function scanMockFiles(
  root: string,
  options: ResolvedOptions
): Promise<string[]> {
  const mockDirPath = resolve(root, options.mockDir)
  const files = await glob(options.include, {
    cwd: mockDirPath,
    absolute: true,
    ignore: options.exclude
  })
  return files
}

export async function loadMockModules(
  files: string[],
  server: ViteDevServer
): Promise<Map<string, MockFileExport>> {
  const modules = new Map<string, MockFileExport>()

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const mod = await server.ssrLoadModule(file)
      return { file, mod }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { file, mod } = result.value
      if (mod.default) {
        modules.set(file, mod as MockFileExport)
      }
    } else {
      console.error(`[mock] Failed to load module:`, result.reason)
    }
  }

  return modules
}

export function mergeMockModules(
  modules: Map<string, MockFileExport>,
  inlineOptions: ResolvedOptions
): ScanResult {
  const mergedRoutes: Routes = { ...inlineOptions.routes }
  const mergedMiddlewares: Middlewares = [...inlineOptions.middlewares]
  const mergedPlugins: Plugins = [...inlineOptions.plugins]

  for (const [_file, mod] of modules) {
    // Merge routes (file routes override inline on conflict)
    if (mod.default) {
      Object.assign(mergedRoutes, mod.default)
    }

    if (mod.middlewares) {
      mergedMiddlewares.push(...mod.middlewares)
    }

    if (mod.plugins) {
      mergedPlugins.push(...mod.plugins)
    }
  }

  return {
    routes: mergedRoutes,
    middlewares: mergedMiddlewares,
    plugins: mergedPlugins
  }
}

export function getMockFileRelativePath(file: string, root: string): string {
  return posix.normalize(relative(root, file))
}
