<script>
  import { currentMonth, currentYear, periodLabel, equipRows, empTrips, commuteList } from '../lib/ghg.js'
  import {
    loadLarkSettings,
    getLarkEnvBuildFlags,
    maskLarkValue,
    clearLarkSettingsStorage,
  } from '../lib/larkSettings.js'
  import {
    buildLarkPeriodRecords,
    syncCurrentPeriodToLark,
    LARK_COL_OFFICE as Oc,
    LARK_COL_TRIP as Tr,
    LARK_COL_COMMUTE as Co,
  } from '../lib/larkBitable.js'
  import { toastOk, toastErr, showErrorDetail } from '../lib/notify.js'
  import { getLastLarkErrorDetails, LarkApiError } from '../lib/larkError.js'
  import { larkOpenApiPrefix } from '../lib/larkBitable.js'

  let { open = $bindable(false) } = $props()

  let busy = $state(false)

  const MAX_PREVIEW = 8

  const preview = $derived.by(() => {
    void $equipRows
    void $empTrips
    void $commuteList
    return buildLarkPeriodRecords()
  })

  const targets = $derived.by(() => {
    if (!open) return { office: false, trips: false, commute: false }
    const s = loadLarkSettings()
    return {
      office: !!s.tableOffice?.trim(),
      trips: !!s.tableTrips?.trim(),
      commute: !!s.tableCommute?.trim(),
    }
  })

  const larkConfig = $derived.by(() => {
    if (!open) return null
    const s = loadLarkSettings()
    const build = getLarkEnvBuildFlags()
    const ok = !!(s.appId && s.appSecret && s.baseAppToken)
    const anyTable = !!(s.tableOffice || s.tableTrips || s.tableCommute)
    return { s, build, ok, anyTable }
  })

  function resetLarkStorage() {
    clearLarkSettingsStorage()
    toastOk('Lark config cleared from browser. Refresh the page — settings will reload from Vercel env variables (after Redeploy).')
  }

  function showLastLarkError() {
    const d = getLastLarkErrorDetails()
    if (!d) {
      toastErr('No Lark errors in this session — try Send to Lark Base first.')
      return
    }
    showErrorDetail(new LarkApiError('Most recent Lark error (current session)', d), 'Lark error details')
  }

  async function onSync() {
    const s = loadLarkSettings()
    if (!s.appId || !s.appSecret || !s.baseAppToken) {
      toastErr('Sync not configured — please contact admin.')
      return
    }
    if (!s.tableOffice?.trim() && !s.tableTrips?.trim() && !s.tableCommute?.trim()) {
      toastErr('No target tables configured — please contact admin.')
      return
    }
    busy = true
    try {
      const r = await syncCurrentPeriodToLark(s)
      const dup = []
      if (r.skippedOffice > 0) dup.push(`Office table (${r.skippedOffice})`)
      if (r.skippedTrips > 0) dup.push(`Employee table (${r.skippedTrips})`)
      if (r.skippedCommute > 0) dup.push(`Commute table (${r.skippedCommute})`)

      if (dup.length > 0) {
        toastErr(
          `Duplicate data detected: ${dup.join(', ')}. Duplicates were skipped, only new rows added.`,
        )
      } else {
        toastOk(`Sent to Lark Base — Office: ${r.office}, Employees: ${r.trips}, Commute: ${r.commute} records`)
        open = false
      }
    } catch (e) {
      await showErrorDetail(e, 'Send to Lark Base failed')
    } finally {
      busy = false
    }
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && (open = false)}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
  >
    <div class="modal lark-modal lark-modal--preview" style="width: min(880px, 100%)">
      <div class="modal-head">
        <span class="modal-title">Lark Base — sync period {periodLabel($currentMonth, $currentYear)}</span>
        <button type="button" class="modal-close" onclick={() => (open = false)} aria-label="Close">×</button>
      </div>
      <div class="modal-body modal-body--scroll">
        <p class="lark-preview-intro">
          Each sync <strong>adds new records</strong> to Lark Base (no ID column sent). Only columns
          <strong>present on the Base</strong> are sent; "Reporting period" is optional (skipped if no period column on Base). Duplicate data will be skipped.
        </p>
        {#if larkConfig}
          <section class="lark-config-status" aria-label="Lark configuration status">
            <h3 class="lark-preview-heading">Lark configuration (env)</h3>
            {#if !larkConfig.build.appId && !larkConfig.build.appSecret}
              <p class="lark-config-warn">
                <code>VITE_LARK_*</code> variables are <strong>empty in this build</strong>. On Vercel: Settings →
                Environment Variables → tick <strong>Production</strong> → <strong>Redeploy</strong> (not just Save).
              </p>
            {:else if larkConfig.ok}
              <p class="lark-config-ok">
                <strong>build ✓</strong> = env variables embedded at build time (App ID, Secret, tables…). Not an API error — if HTTP
                404 <code>/api/lark</code> then Redeploy after updating <code>vercel.json</code>.
              </p>
            {:else}
              <p class="lark-config-warn">Missing App ID / Secret / Base token after merging env — check variable names are exactly
                <code>VITE_LARK_APP_ID</code>, …</p>
            {/if}
            <ul class="lark-config-list">
              <li>
                <span>App ID</span>
                <code>{maskLarkValue(larkConfig.s.appId)}</code>
                <span class="lark-config-flag" class:ok={larkConfig.build.appId} class:bad={!larkConfig.build.appId}
                  >{larkConfig.build.appId ? 'build ✓' : 'build ✗'}</span
                >
              </li>
              <li>
                <span>App Secret</span>
                <code>{larkConfig.s.appSecret ? '••••••' : '(empty)'}</code>
                <span class="lark-config-flag" class:ok={larkConfig.build.appSecret} class:bad={!larkConfig.build.appSecret}
                  >{larkConfig.build.appSecret ? 'build ✓' : 'build ✗'}</span
                >
              </li>
              <li>
                <span>Base token</span>
                <code>{maskLarkValue(larkConfig.s.baseAppToken)}</code>
                <span
                  class="lark-config-flag"
                  class:ok={larkConfig.build.baseAppToken}
                  class:bad={!larkConfig.build.baseAppToken}>{larkConfig.build.baseAppToken ? 'build ✓' : 'build ✗'}</span
                >
              </li>
              <li>
                <span>Office table</span>
                <code>{maskLarkValue(larkConfig.s.tableOffice, 3)}</code>
                <span
                  class="lark-config-flag"
                  class:ok={larkConfig.build.tableOffice}
                  class:bad={!larkConfig.build.tableOffice}>{larkConfig.build.tableOffice ? 'build ✓' : 'build ✗'}</span
                >
              </li>
              <li>
                <span>Trips table</span>
                <code>{maskLarkValue(larkConfig.s.tableTrips, 3)}</code>
                <span
                  class="lark-config-flag"
                  class:ok={larkConfig.build.tableTrips}
                  class:bad={!larkConfig.build.tableTrips}>{larkConfig.build.tableTrips ? 'build ✓' : 'build ✗'}</span
                >
              </li>
              <li>
                <span>Commute table</span>
                <code>{maskLarkValue(larkConfig.s.tableCommute, 3)}</code>
                <span
                  class="lark-config-flag"
                  class:ok={larkConfig.build.tableCommute}
                  class:bad={!larkConfig.build.tableCommute}
                  >{larkConfig.build.tableCommute ? 'build ✓' : 'build ✗'}</span
                >
              </li>
            </ul>
            <button type="button" class="btn btn-sm" onclick={resetLarkStorage}>Clear Lark config from browser</button>
          </section>
        {/if}

        <div class="lark-target-chips" aria-label="Configured target tables">
          <span class="lark-target-chip" class:inactive={!targets.office}>
            Office (Scope 1 &amp; 2){#if targets.office}<span class="lark-target-ok"> · will send</span>{:else}<span class="lark-target-skip"> · no table assigned</span>{/if}
          </span>
          <span class="lark-target-chip" class:inactive={!targets.trips}>
            Employees (Scope 3){#if targets.trips}<span class="lark-target-ok"> · will send</span>{:else}<span class="lark-target-skip"> · no table assigned</span>{/if}
          </span>
          <span class="lark-target-chip" class:inactive={!targets.commute}>
            Daily commute{#if targets.commute}<span class="lark-target-ok"> · will send</span>{:else}<span class="lark-target-skip"> · no table assigned</span>{/if}
          </span>
        </div>

        <section class="lark-preview-block">
          <h3 class="lark-preview-heading">
            Office — {preview.officeFields.length} rows
          </h3>
          {#if preview.officeFields.length === 0}
            <p class="lark-preview-empty">No equipment included in this period's report.</p>
          {:else}
            <div class="lark-preview-table-wrap">
              <table class="lark-preview-table">
                <thead>
                  <tr>
                    <th>{Oc.ThietBi}</th>
                    <th>{Oc.Scope}</th>
                    <th class="num">{Oc.TongGhg}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each preview.officeFields.slice(0, MAX_PREVIEW) as row}
                    <tr>
                      <td>{row[Oc.ThietBi] || '—'}</td>
                      <td>{row[Oc.Scope] || '—'}</td>
                      <td class="num">{row[Oc.TongGhg] || '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            {#if preview.officeFields.length > MAX_PREVIEW}
              <p class="lark-preview-more">… and {preview.officeFields.length - MAX_PREVIEW} more rows (with all columns when sent).</p>
            {/if}
            <p class="lark-preview-cols-hint">
              Additional columns sent: {Oc.NguonPhatThai}, {Oc.DonVi}, {Oc.KhoiLuong}, {Oc.Ef}, {Oc.EfRef}.
            </p>
          {/if}
        </section>

        <section class="lark-preview-block">
          <h3 class="lark-preview-heading">
            Employees (business trips) — {preview.tripRows.length} rows
          </h3>
          {#if preview.tripRows.length === 0}
            <p class="lark-preview-empty">No business trips in this period.</p>
          {:else}
            <div class="lark-preview-table-wrap">
              <table class="lark-preview-table">
                <thead>
                  <tr>
                    <th>{Tr.HoTen}</th>
                    <th>{Tr.TenChuyen}</th>
                    <th class="num">{Tr.Tong}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each preview.tripRows.slice(0, MAX_PREVIEW) as row}
                    <tr>
                      <td>{row[Tr.HoTen] || '—'}</td>
                      <td>{row[Tr.TenChuyen] || '—'}</td>
                      <td class="num">{row[Tr.Tong] || '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            {#if preview.tripRows.length > MAX_PREVIEW}
              <p class="lark-preview-more">… and {preview.tripRows.length - MAX_PREVIEW} more rows.</p>
            {/if}
            <p class="lark-preview-cols-hint">
              Additional columns sent: {Tr.MaNv}, {Tr.PhongBan}, {Tr.MucDich}, {Tr.XuatPhat}, {Tr.Den}, {Tr.NgayDi}, {Tr.NgayVe},
              {Tr.Co2Bay}, {Tr.Co2MatDat}, {Tr.Co2LuuTru}.
            </p>
          {/if}
        </section>

        <section class="lark-preview-block">
          <h3 class="lark-preview-heading">
            Daily commute — {preview.commuteRows.length} rows
          </h3>
          {#if preview.commuteRows.length === 0}
            <p class="lark-preview-empty">No commute rows in this period.</p>
          {:else}
            <div class="lark-preview-table-wrap">
              <table class="lark-preview-table">
                <thead>
                  <tr>
                    <th>{Co.HoTen}</th>
                    <th>{Co.PhuongTien}</th>
                    <th class="num">{Co.Co2e}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each preview.commuteRows.slice(0, MAX_PREVIEW) as row}
                    <tr>
                      <td>{row[Co.HoTen] || '—'}</td>
                      <td>{row[Co.PhuongTien] || '—'}</td>
                      <td class="num">{row[Co.Co2e] || '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            {#if preview.commuteRows.length > MAX_PREVIEW}
              <p class="lark-preview-more">… and {preview.commuteRows.length - MAX_PREVIEW} more rows.</p>
            {/if}
            <p class="lark-preview-cols-hint">
              Additional columns sent: {Co.MaNv}, {Co.PhongBan}, {Co.KmMotChieu}, {Co.NgayDiLamThang}, {Co.Wfh}, {Co.Carpool}.
            </p>
          {/if}
        </section>
      </div>
      <div class="modal-foot lark-modal-foot">
        <p class="lark-debug-hint">
          API endpoint: <code>{larkOpenApiPrefix()}</code> · On error: click <strong>Error details</strong> or open <strong>F12 → Console</strong>.
        </p>
        <div class="lark-modal-foot-actions">
          <button type="button" class="btn btn-primary" onclick={onSync} disabled={busy}>
            {busy ? 'Sending to Lark Base…' : 'Send to Lark Base'}
          </button>
          <button type="button" class="btn" onclick={showLastLarkError} disabled={busy}>
            Error details
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
