import type { Buffer } from 'node:buffer'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { describe, expect, it, vi } from 'vitest'

import { createLogger } from '../src/logger'
import { createMockMiddleware } from '../src/middleware'
import { resolveOptions } from '../src/utils'

function createMockReq(
  method: string,
  url: string,
  headers: Record<string, string> = {}
): IncomingMessage {
  return {
    method,
    url,
    headers: { host: 'localhost:3000', ...headers },
    pipe: vi.fn()
  } as unknown as IncomingMessage
}

function createMockRes(): ServerResponse & {
  _data: string
  _status: number
  _headers: Record<string, string>
} {
  const res = {
    _data: '',
    _status: 200,
    _headers: {} as Record<string, string>,
    headersSent: false,
    statusCode: 200,
    statusMessage: 'OK',
    setHeader: vi.fn((key: string, value: string) => {
      res._headers[key] = value
    }),
    writeHead: vi.fn((status: number) => {
      res._status = status
    }),
    write: vi.fn((chunk: Buffer | string) => {
      res._data += chunk.toString()
    }),
    end: vi.fn((data?: string) => {
      if (data) res._data += data
    })
  } as unknown as ServerResponse & {
    _data: string
    _status: number
    _headers: Record<string, string>
  }
  return res
}

describe('createMockMiddleware', () => {
  it('should call next() when plugin is disabled', async () => {
    const options = resolveOptions({ enabled: false })
    const logger = createLogger(false)
    const next = vi.fn()

    const mockApp = { fetch: vi.fn() }
    const middleware = createMockMiddleware({
      getApp: () => mockApp as any,
      options,
      logger
    })

    const req = createMockReq('GET', '/api/users')
    const res = createMockRes()

    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(mockApp.fetch).not.toHaveBeenCalled()
  })

  it('should call next() when path does not match prefix', async () => {
    const options = resolveOptions({ prefix: '/api' })
    const logger = createLogger(false)
    const next = vi.fn()

    const mockApp = { fetch: vi.fn() }
    const middleware = createMockMiddleware({
      getApp: () => mockApp as any,
      options,
      logger
    })

    const req = createMockReq('GET', '/other/path')
    const res = createMockRes()

    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(mockApp.fetch).not.toHaveBeenCalled()
  })

  it('should call app.fetch for matching prefix', async () => {
    const options = resolveOptions({ prefix: '/api' })
    const logger = createLogger(false)
    const next = vi.fn()

    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

    const mockApp = { fetch: vi.fn().mockResolvedValue(mockResponse) }
    const middleware = createMockMiddleware({
      getApp: () => mockApp as any,
      options,
      logger
    })

    const req = createMockReq('GET', '/api/users')
    const res = createMockRes()

    await middleware(req, res, next)
    expect(mockApp.fetch).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next() when app returns 404', async () => {
    const options = resolveOptions({ prefix: '/api' })
    const logger = createLogger(false)
    const next = vi.fn()

    const mockResponse = new Response('Not Found', { status: 404 })
    const mockApp = { fetch: vi.fn().mockResolvedValue(mockResponse) }

    const middleware = createMockMiddleware({
      getApp: () => mockApp as any,
      options,
      logger
    })

    const req = createMockReq('GET', '/api/unknown')
    const res = createMockRes()

    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
