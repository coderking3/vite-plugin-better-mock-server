import type { App } from 'better-mock-server'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'

import type { Logger } from './logger'
import type { ResolvedOptions } from './types'

import { Readable } from 'node:stream'

import { createFallbackProxy } from './fallback'
import { isEnabled, matchesPrefix, stripPrefix } from './utils'

export interface MockMiddlewareContext {
  getApp: () => App
  options: ResolvedOptions
  logger: Logger
}

export function createMockMiddleware(
  ctx: MockMiddlewareContext
): Connect.NextHandleFunction {
  const { options, logger } = ctx
  const fallbackProxy = options.fallback
    ? createFallbackProxy(options.fallback)
    : undefined

  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ) => {
    // Check if plugin is enabled
    if (!isEnabled(options.enabled)) {
      return next()
    }

    const url = req.url || '/'
    const pathname = url.split('?')[0]

    // Check if request matches prefix
    if (!matchesPrefix(pathname, options.prefix)) {
      return next()
    }

    const startTime = Date.now()
    const method = req.method || 'GET'

    try {
      // Build a standard Request from IncomingMessage
      const app = ctx.getApp()
      const request = toWebRequest(req, options.prefix)
      const response = await app.fetch(request)

      // If 404, the route is not matched in mock — fall through
      if (response.status === 404) {
        if (fallbackProxy) {
          logger.fallback(method, pathname)
          return fallbackProxy(req, res)
        }
        return next()
      }

      // Write the h3 Response back to the Node.js ServerResponse
      await writeResponse(res, response)

      const duration = Date.now() - startTime
      logger.request(method, pathname, response.status, duration)
    } catch (err) {
      logger.error(`Error handling ${method} ${pathname}`, err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Mock server error' }))
      }
    }
  }
}

function toWebRequest(req: IncomingMessage, prefix: string): Request {
  const url = req.url || '/'
  // Strip the prefix so h3 routes match without it
  const strippedUrl = stripPrefix(url, prefix)
  const fullUrl = `http://${req.headers.host || 'localhost'}${strippedUrl}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else {
        headers.set(key, value)
      }
    }
  }

  const method = req.method || 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'

  return new Request(fullUrl, {
    method,
    headers,
    body: hasBody
      ? (Readable.toWeb(req) as unknown as ReadableStream)
      : undefined,
    // @ts-expect-error - duplex is needed for streaming request bodies
    duplex: hasBody ? 'half' : undefined
  })
}

async function writeResponse(
  res: ServerResponse,
  response: Response
): Promise<void> {
  // Set status
  res.statusCode = response.status
  res.statusMessage = response.statusText

  // Set headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  // Write body
  if (response.body) {
    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    } finally {
      reader.releaseLock()
    }
  }

  res.end()
}
