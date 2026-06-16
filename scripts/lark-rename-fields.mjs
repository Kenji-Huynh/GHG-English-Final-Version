/**
 * One-off: list & rename Lark Base columns VN → EN (matches src/lib/larkBitable.js).
 * Usage: node scripts/lark-rename-fields.mjs [--dry-run]
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')

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

const RENAME_MAP = {
  // Period
  'Kỳ báo cáo': 'Reporting Period',
  'Kỳ': 'Reporting Period',
  'Kỳ (mã)': 'Reporting Period',
  // Office
  'Công ty': 'Company',
  'Thiết bị': 'Equipment',
  'Nguồn phát thải': 'Emission Source',
  'Phạm vi': 'Scope',
  'Đơn vị': 'Unit',
  'Khối lượng': 'Volume',
  'EF (kg CO₂e/đơn vị)': 'EF (kg CO₂e/unit)',
  'EF (kg CO2e/đơn vị)': 'EF (kg CO₂e/unit)',
  'EF (kg CO₂e/đvị)': 'EF (kg CO₂e/unit)',
  'EF (kg CO2e/đvị)': 'EF (kg CO₂e/unit)',
  'Tham chiếu EF': 'EF Reference',
  'EF tham chiếu': 'EF Reference',
  'Tổng GHG (tấn CO₂e)': 'Total GHG (tonnes CO₂e)',
  'Tổng GHG (tấn CO2e)': 'Total GHG (tonnes CO₂e)',
  // Trips
  'Họ tên': 'Full Name',
  'Họ và tên': 'Full Name',
  'Mã NV': 'Emp ID',
  'Phòng ban': 'Department',
  'Tên chuyến': 'Trip Name',
  'Mục đích': 'Purpose',
  'Xuất phát': 'From',
  'Điểm xuất phát': 'From',
  'Từ': 'From',
  'Đến': 'To',
  'Điểm đến': 'To',
  'Ngày đi': 'Departure Date',
  'Ngày về': 'Return Date',
  'CO₂ bay (kg)': 'CO₂ flight (kg)',
  'CO2 bay (kg)': 'CO₂ flight (kg)',
  'CO₂ mặt đất (kg)': 'CO₂ ground (kg)',
  'CO2 mặt đất (kg)': 'CO₂ ground (kg)',
  'CO₂ lưu trú (kg)': 'CO₂ accommodation (kg)',
  'CO2 lưu trú (kg)': 'CO₂ accommodation (kg)',
  'Tổng (kg CO₂e)': 'Total (kg CO₂e)',
  'Tổng (kg CO2e)': 'Total (kg CO₂e)',
  'Chi tiết phương tiện': 'Transport details',
  'Phương tiện chi tiết': 'Transport details',
  'Chi tiết lưu trú': 'Accommodation details',
  'Lưu trú chi tiết': 'Accommodation details',
  // Commute
  'Phương tiện': 'Vehicle',
  'Km một chiều': 'One-way km',
  'Ngày đi làm / tháng': 'Working days / Month',
  'Ngày đi làm/tháng': 'Working days / Month',
  'Ngày đi làm tháng': 'Working days / Month',
  'Ngày đi làm / Tháng': 'Working days / Month',
  'WFH (ngày/tháng)': 'WFH (days/month)',
  'Carpool (người)': 'Carpool (people)',
  'CO₂e (kg)': 'CO₂e (kg)',
  'CO2e (kg)': 'CO₂e (kg)',
  // Close table (if used)
  'Loại': 'Type',
  'Scope 1 (tấn)': 'Scope 1 (tonnes)',
  'Scope 2 (tấn)': 'Scope 2 (tonnes)',
  'Scope 3 (tấn)': 'Scope 3 (tonnes)',
  'Tổng (tấn)': 'Total (tonnes)',
  'Ngày đóng kỳ': 'Period close date',
  'Số dòng văn phòng': 'Office rows',
  'Số chuyến công tác': 'Business trip rows',
  'Số dòng đi làm': 'Commute rows',
}

const LARK = 'https://open.larksuite.com'

async function larkJson(path, opts = {}, token) {
  const res = await fetch(`${LARK}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const json = await res.json()
  return { status: res.status, json }
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

async function listFields(token, appToken, tableId) {
  /** @type {Array<{ field_id: string, field_name: string, type: number, property?: unknown }>} */
  const items = []
  let pageToken = ''
  for (let i = 0; i < 50; i++) {
    const qs = new URLSearchParams({ page_size: '100' })
    if (pageToken) qs.set('page_token', pageToken)
    const path = `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?${qs}`
    const { json } = await larkJson(path, { method: 'GET' }, token)
    if (json.code !== 0) throw new Error(`List fields ${tableId}: ${json.msg} (${json.code})`)
    items.push(...(json.data?.items || []))
    if (!json.data?.has_more) break
    pageToken = json.data?.page_token || ''
    if (!pageToken) break
  }
  return items
}

async function renameField(token, appToken, tableId, field) {
  const newName = RENAME_MAP[field.field_name]
  if (!newName || newName === field.field_name) return null
  const path = `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields/${encodeURIComponent(field.field_id)}`
  const body = { field_name: newName, type: field.type }
  if (field.property != null) body.property = field.property
  if (dryRun) return { from: field.field_name, to: newName, dry: true }
  const { json } = await larkJson(path, { method: 'PUT', body: JSON.stringify(body) }, token)
  if (json.code !== 0) {
    throw new Error(`Rename "${field.field_name}" → "${newName}": ${json.msg} (${json.code})`)
  }
  return { from: field.field_name, to: newName }
}

async function main() {
  const env = loadEnvLocal()
  const appId = env.VITE_LARK_APP_ID
  const appSecret = env.VITE_LARK_APP_SECRET
  const appToken = env.VITE_LARK_BASE_APP_TOKEN
  const tables = {
    Office: env.VITE_LARK_TABLE_OFFICE,
    Trips: env.VITE_LARK_TABLE_TRIPS,
    Commute: env.VITE_LARK_TABLE_COMMUTE,
  }

  if (!appId || !appSecret || !appToken) {
    throw new Error('Missing VITE_LARK_APP_ID / SECRET / BASE_APP_TOKEN in .env.local')
  }

  console.log(dryRun ? '=== DRY RUN ===' : '=== RENAME FIELDS ===')
  const token = await getToken(appId, appSecret)
  console.log('Token OK\n')

  /** @type {Array<{ table: string, renames: Array<{ from: string, to: string }>, unchanged: string[], unmapped: string[] }>} */
  const report = []

  for (const [label, tableId] of Object.entries(tables)) {
    if (!tableId?.trim()) continue
    console.log(`\n--- ${label} (${tableId}) ---`)
    const fields = await listFields(token, appToken, tableId.trim())
    const renames = []
    const unchanged = []
    const unmapped = []

    for (const f of fields) {
      const name = String(f.field_name || '').trim()
      const target = RENAME_MAP[name]
      if (!target) {
        if (name) unmapped.push(name)
        continue
      }
      if (target === name) {
        unchanged.push(name)
        continue
      }
      const r = await renameField(token, appToken, tableId.trim(), f)
      if (r) {
        renames.push(r)
        console.log(`  ✓ ${r.from} → ${r.to}${r.dry ? ' (dry-run)' : ''}`)
      }
      await new Promise((r) => setTimeout(r, 120))
    }

    if (unchanged.length) console.log(`  Already EN: ${unchanged.join(', ')}`)
    if (unmapped.length) console.log(`  No mapping (kept as-is): ${unmapped.join(', ')}`)
    if (!renames.length && !unchanged.length && !unmapped.length) console.log('  (no fields)')

    report.push({ table: label, renames, unchanged, unmapped })
  }

  console.log('\n=== SUMMARY ===')
  for (const r of report) {
    console.log(`${r.table}: ${r.renames.length} renamed, ${r.unchanged.length} already OK, ${r.unmapped.length} unmapped`)
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
