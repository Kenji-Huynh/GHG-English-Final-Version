/**
 * Rename Lark Base table tabs (left sidebar) to match English web labels.
 * Usage: node scripts/lark-rename-tables.mjs [--dry-run]
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const LARK = 'https://open.larksuite.com'

/** Target names — match App.svelte nav tabs */
const TABLE_TARGETS = {
  office: 'Office (Scope 1 & 2)',
  trips: 'Employees (Scope 3)',
  commute: 'Daily Commute',
}

/** Vietnamese / legacy names → target (by fuzzy match on current name) */
const NAME_ALIASES = [
  [/văn phòng|office/i, TABLE_TARGETS.office],
  [/công tác|nhân viên|business|trip|chuyến/i, TABLE_TARGETS.trips],
  [/đi làm|commute|di chuyển/i, TABLE_TARGETS.commute],
]

function loadEnvLocal() {
  const path = resolve(root, '.env.local')
  const text = readFileSync(path, 'utf8')
  /** @type {Record<string, string>} */
  const env = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

async function larkJson(path, opts = {}, token) {
  const res = await fetch(`${LARK}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  return { status: res.status, json: await res.json() }
}

async function getToken(appId, appSecret) {
  const { json } = await larkJson('/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  if (json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`Token failed: ${json.msg || json.code}`)
  }
  return json.tenant_access_token
}

async function listTables(token, appToken) {
  /** @type {Array<{ table_id: string, name: string }>} */
  const items = []
  let pageToken = ''
  for (let i = 0; i < 50; i++) {
    const qs = new URLSearchParams({ page_size: '100' })
    if (pageToken) qs.set('page_token', pageToken)
    const path = `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?${qs}`
    const { json } = await larkJson(path, { method: 'GET' }, token)
    if (json.code !== 0) throw new Error(`List tables: ${json.msg} (${json.code})`)
    for (const t of json.data?.items || []) {
      items.push({ table_id: t.table_id, name: t.name })
    }
    if (!json.data?.has_more) break
    pageToken = json.data?.page_token || ''
    if (!pageToken) break
  }
  return items
}

async function renameTable(token, appToken, tableId, newName) {
  const path = `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}`
  if (dryRun) return { ok: true, dry: true }
  const { json } = await larkJson(path, { method: 'PATCH', body: JSON.stringify({ name: newName }) }, token)
  if (json.code !== 0) throw new Error(`Rename table ${tableId}: ${json.msg} (${json.code})`)
  return { ok: true, name: json.data?.name || newName }
}

async function main() {
  const env = loadEnvLocal()
  const appId = env.VITE_LARK_APP_ID
  const appSecret = env.VITE_LARK_APP_SECRET
  const appToken = env.VITE_LARK_BASE_APP_TOKEN
  const ids = {
    office: env.VITE_LARK_TABLE_OFFICE?.trim(),
    trips: env.VITE_LARK_TABLE_TRIPS?.trim(),
    commute: env.VITE_LARK_TABLE_COMMUTE?.trim(),
  }

  if (!appId || !appSecret || !appToken) {
    throw new Error('Missing Lark credentials in .env.local')
  }

  console.log(dryRun ? '=== DRY RUN (tables) ===' : '=== RENAME TABLES ===')
  const token = await getToken(appId, appSecret)
  const tables = await listTables(token, appToken)

  console.log('\nAll tables in Base:')
  for (const t of tables) console.log(`  - ${t.name} (${t.table_id})`)

  const byId = new Map(tables.map((t) => [t.table_id, t]))

  const plan = [
    { key: 'office', tableId: ids.office, target: TABLE_TARGETS.office },
    { key: 'trips', tableId: ids.trips, target: TABLE_TARGETS.trips },
    { key: 'commute', tableId: ids.commute, target: TABLE_TARGETS.commute },
  ]

  console.log('\nRenaming configured tables:')
  for (const p of plan) {
    if (!p.tableId) {
      console.log(`  ✗ ${p.key}: no table ID in .env.local`)
      continue
    }
    const current = byId.get(p.tableId)
    if (!current) {
      console.log(`  ✗ ${p.key}: table_id ${p.tableId} not found in Base`)
      continue
    }
    if (current.name === p.target) {
      console.log(`  ✓ ${p.key}: already "${p.target}"`)
      continue
    }
    await renameTable(token, appToken, p.tableId, p.target)
    console.log(`  ✓ ${p.key}: "${current.name}" → "${p.target}"${dryRun ? ' (dry-run)' : ''}`)
    await new Promise((r) => setTimeout(r, 150))
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
