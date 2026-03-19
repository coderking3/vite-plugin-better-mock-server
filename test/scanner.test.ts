import type { Middlewares, Routes } from 'better-mock-server'

import type { MockFileExport } from '../src/types'

import { describe, expect, it } from 'vitest'

import { mergeMockModules } from '../src/scanner'
import { resolveOptions } from '../src/utils'

describe('mergeMockModules', () => {
  it('should merge routes from multiple modules', () => {
    const modules = new Map<string, MockFileExport>([
      [
        '/mock/user.ts',
        {
          default: {
            '/users': () => [{ id: 1 }]
          } as Routes
        }
      ],
      [
        '/mock/auth.ts',
        {
          default: {
            '/login': () => ({ token: 'abc' })
          } as Routes
        }
      ]
    ])

    const options = resolveOptions({})
    const result = mergeMockModules(modules, options)

    expect(result.routes).toHaveProperty('/users')
    expect(result.routes).toHaveProperty('/login')
  })

  it('should override inline routes with file routes', () => {
    const modules = new Map<string, MockFileExport>([
      [
        '/mock/user.ts',
        {
          default: {
            '/users': () => [{ id: 2, source: 'file' }]
          } as Routes
        }
      ]
    ])

    const options = resolveOptions({
      routes: {
        '/users': () => [{ id: 1, source: 'inline' }]
      } as Routes
    })

    const result = mergeMockModules(modules, options)
    // File routes should override inline
    const handler = result.routes['/users'] as (...args: unknown[]) => unknown
    expect(handler()).toEqual([{ id: 2, source: 'file' }])
  })

  it('should merge middlewares from files and inline', () => {
    const fileMiddleware = () => {}
    const inlineMiddleware = () => {}

    const modules = new Map<string, MockFileExport>([
      [
        '/mock/user.ts',
        {
          default: {} as Routes,
          middlewares: [fileMiddleware] as Middlewares
        }
      ]
    ])

    const options = resolveOptions({
      middlewares: [inlineMiddleware] as Middlewares
    })

    const result = mergeMockModules(modules, options)
    expect(result.middlewares).toHaveLength(2)
    expect(result.middlewares[0]).toBe(inlineMiddleware)
    expect(result.middlewares[1]).toBe(fileMiddleware)
  })
})
