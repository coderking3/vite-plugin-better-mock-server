import type { MockServerPluginOptions, ResolvedOptions } from './types'

export function resolveOptions(
  options: MockServerPluginOptions
): ResolvedOptions {
  return {
    mockDir: options.mockDir ?? 'mock',
    include: options.include ?? ['**/*.ts', '**/*.js'],
    exclude: options.exclude ?? [],
    routes: options.routes ?? {},
    middlewares: options.middlewares ?? [],
    plugins: options.plugins ?? [],
    enabled: options.enabled ?? true,
    prefix: normalizePrefix(options.prefix ?? ''),
    logger: options.logger ?? true,
    fallback: options.fallback
  }
}

export function normalizePrefix(prefix: string): string {
  if (!prefix) return ''
  // Ensure prefix starts with /
  if (!prefix.startsWith('/')) {
    prefix = `/${prefix}`
  }
  // Remove trailing slash
  if (prefix.endsWith('/')) {
    prefix = prefix.slice(0, -1)
  }
  return prefix
}

export function isEnabled(enabled: boolean | (() => boolean)): boolean {
  return typeof enabled === 'function' ? enabled() : enabled
}

export function stripPrefix(path: string, prefix: string): string {
  if (!prefix) return path
  if (path.startsWith(prefix)) {
    const stripped = path.slice(prefix.length)
    return stripped || '/'
  }
  return path
}

export function matchesPrefix(path: string, prefix: string): boolean {
  if (!prefix) return true
  return path.startsWith(prefix)
}
