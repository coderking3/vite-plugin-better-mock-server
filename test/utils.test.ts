import { describe, expect, it } from 'vitest'

import {
  isEnabled,
  matchesPrefix,
  normalizePrefix,
  resolveOptions,
  stripPrefix
} from '../src/utils'

describe('normalizePrefix', () => {
  it('should return empty string for empty input', () => {
    expect(normalizePrefix('')).toBe('')
  })

  it('should ensure prefix starts with /', () => {
    expect(normalizePrefix('api')).toBe('/api')
  })

  it('should remove trailing slash', () => {
    expect(normalizePrefix('/api/')).toBe('/api')
  })

  it('should handle already normalized prefix', () => {
    expect(normalizePrefix('/api')).toBe('/api')
  })

  it('should handle nested prefix', () => {
    expect(normalizePrefix('/api/v1/')).toBe('/api/v1')
  })
})

describe('isEnabled', () => {
  it('should return boolean directly', () => {
    expect(isEnabled(true)).toBe(true)
    expect(isEnabled(false)).toBe(false)
  })

  it('should call function and return result', () => {
    expect(isEnabled(() => true)).toBe(true)
    expect(isEnabled(() => false)).toBe(false)
  })
})

describe('stripPrefix', () => {
  it('should strip prefix from path', () => {
    expect(stripPrefix('/api/users', '/api')).toBe('/users')
  })

  it('should return / when path equals prefix', () => {
    expect(stripPrefix('/api', '/api')).toBe('/')
  })

  it('should return path unchanged when no prefix', () => {
    expect(stripPrefix('/users', '')).toBe('/users')
  })

  it('should return path unchanged when prefix does not match', () => {
    expect(stripPrefix('/other/users', '/api')).toBe('/other/users')
  })
})

describe('matchesPrefix', () => {
  it('should match when path starts with prefix', () => {
    expect(matchesPrefix('/api/users', '/api')).toBe(true)
  })

  it('should match when path equals prefix', () => {
    expect(matchesPrefix('/api', '/api')).toBe(true)
  })

  it('should not match when path does not start with prefix', () => {
    expect(matchesPrefix('/other', '/api')).toBe(false)
  })

  it('should always match when prefix is empty', () => {
    expect(matchesPrefix('/anything', '')).toBe(true)
  })
})

describe('resolveOptions', () => {
  it('should provide defaults for all options', () => {
    const opts = resolveOptions({})
    expect(opts.mockDir).toBe('mock')
    expect(opts.include).toEqual(['**/*.ts', '**/*.js'])
    expect(opts.exclude).toEqual([])
    expect(opts.routes).toEqual({})
    expect(opts.middlewares).toEqual([])
    expect(opts.plugins).toEqual([])
    expect(opts.enabled).toBe(true)
    expect(opts.prefix).toBe('')
    expect(opts.logger).toBe(true)
    expect(opts.fallback).toBeUndefined()
  })

  it('should normalize prefix', () => {
    const opts = resolveOptions({ prefix: 'api/' })
    expect(opts.prefix).toBe('/api')
  })

  it('should preserve user-provided options', () => {
    const opts = resolveOptions({
      mockDir: 'mocks',
      logger: false
    })
    expect(opts.mockDir).toBe('mocks')
    expect(opts.logger).toBe(false)
  })
})
