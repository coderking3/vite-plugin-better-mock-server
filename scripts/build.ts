/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import pc from 'picocolors'

// File rename configuration
const RENAME_MAP = [{ from: 'index.d.mts', to: 'index.d.ts' }] as const

const distDir = join(process.cwd(), 'dist')

/**
 * Rename a file in the dist directory
 */
function renameFile(from: string, to: string): boolean {
  const sourcePath = join(distDir, from)
  const targetPath = join(distDir, to)

  if (!existsSync(sourcePath)) {
    console.log(
      pc.dim('  ℹ️  ') + pc.yellow(from) + pc.dim(' not found, skipping...')
    )
    return false
  }

  try {
    renameSync(sourcePath, targetPath)
    console.log(
      pc.green('🔁 Renamed ') + pc.cyan(from) + pc.dim(' → ') + pc.magenta(to)
    )
    return true
  } catch (error) {
    console.error(
      pc.bold(pc.red('❌ Failed to rename ')) +
        pc.cyan(from) +
        pc.red(': ') +
        pc.red(formatError(error))
    )
    return false
  }
}

/**
 * Format error message for display
 */
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return JSON.stringify(error)
}

/**
 * Main build process
 */
function build() {
  try {
    console.log(pc.bold(pc.cyan('\n🚀 Starting build script...\n')))
    console.log(pc.bold(pc.yellow('📦 Running tsdown build...')))

    execSync('tsdown', { stdio: 'inherit' })

    console.log(pc.bold(pc.cyan('\n🔧 Post-build processing...\n')))

    // Rename files
    RENAME_MAP.forEach(({ from, to }) => renameFile(from, to))

    console.log(pc.bold(pc.green('\n🎉 Build completed successfully!\n')))
  } catch (error) {
    console.error(
      `${pc.bold(pc.red('\n❌ Build failed: ')) + pc.red(formatError(error))}\n`
    )
    process.exit(1)
  }
}

build()
