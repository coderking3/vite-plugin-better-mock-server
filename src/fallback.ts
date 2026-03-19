import type { IncomingMessage, ServerResponse } from 'node:http'

import type { FallbackOptions } from './types'

import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export function createFallbackProxy(options: FallbackOptions) {
  const { target, changeOrigin = true } = options
  const targetUrl = new URL(target)
  const isHttps = targetUrl.protocol === 'https:'
  const requestFn = isHttps ? httpsRequest : httpRequest

  return (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '/'
    const headers = { ...req.headers }

    if (changeOrigin) {
      headers.host = targetUrl.host
    }

    const proxyReq = requestFn(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: url,
        method: req.method,
        headers
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
        proxyRes.pipe(res)
      }
    )

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
      }
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
    })

    req.pipe(proxyReq)
  }
}
