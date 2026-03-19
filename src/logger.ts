/* eslint-disable no-console */
import type { LoggerOptions } from './types'

import pc from 'picocolors'

const TAG = `${pc.cyan('[mock]')}`

export function createLogger(options: boolean | LoggerOptions) {
  const opts: LoggerOptions =
    typeof options === 'boolean'
      ? { request: options, fallback: options }
      : options

  return {
    request(method: string, path: string, status: number, duration: number) {
      if (opts.request === false) return
      const methodStr = pc.bold(method.padEnd(7))
      const pathStr = pc.white(path)
      const statusStr =
        status < 400 ? pc.green(String(status)) : pc.red(String(status))
      const durationStr = pc.dim(`${duration}ms`)
      console.log(`${TAG} ${methodStr} ${pathStr} ${statusStr} ${durationStr}`)
    },

    fallback(method: string, path: string) {
      if (opts.fallback === false) return
      const methodStr = pc.bold(method.padEnd(7))
      const pathStr = pc.white(path)
      console.log(`${TAG} ${methodStr} ${pathStr} ${pc.yellow('→ fallback')}`)
    },

    reload(file: string) {
      console.log(`${TAG} ${pc.green('reloaded')}: ${pc.dim(file)}`)
    },

    error(message: string, err?: unknown) {
      console.error(
        `${TAG} ${pc.red(message)}`,
        err instanceof Error ? err.message : ''
      )
    }
  }
}

export type Logger = ReturnType<typeof createLogger>
