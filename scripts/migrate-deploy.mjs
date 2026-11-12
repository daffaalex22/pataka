#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const vercelEnv = process.env.VERCEL_ENV

if (vercelEnv !== 'production') {
  console.log(`[migrate-deploy] skipped (VERCEL_ENV=${vercelEnv ?? 'unset'})`)
  process.exit(0)
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('[migrate-deploy] DATABASE_URL_UNPOOLED / DATABASE_URL is not set')
  process.exit(1)
}

const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown commit'
console.log(`[migrate-deploy] applying schema migrations for ${commit}`)

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', 'src/lib/cli.ts', 'migrate'],
  {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
)

if (result.error) {
  console.error('[migrate-deploy] failed to start the migration:', result.error)
  process.exit(1)
}

if (result.status !== 0) {
  console.error(`[migrate-deploy] migration failed with exit code ${result.status}`)
  process.exit(result.status ?? 1)
}

console.log('[migrate-deploy] schema is up to date')
