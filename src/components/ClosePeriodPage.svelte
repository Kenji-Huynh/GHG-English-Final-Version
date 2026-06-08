<script>
  import {
    currentMonth,
    currentYear,
    periodKey,
    periodLabel,
  } from '../lib/ghg.js'
  import {
    loadSnapshots,
    createSnapshot,
    hasSnapshot,
    deleteSnapshot,
    runScheduledSnapshots,
    snapshotTotalsForCompany,
  } from '../lib/snapshots.js'
  import { loadLarkSettings } from '../lib/larkSettings.js'
  import { syncSnapshotToLark } from '../lib/larkBitable.js'
  import { COMPANIES } from '../lib/companies.js'
  import { toastOk, toastErr, showErrorDetail } from '../lib/notify.js'

  let snapshots = $state(loadSnapshots())
  let busy = $state(false)
  let selectedId = $state('')

  const selected = $derived(snapshots.find((s) => s.id === selectedId) ?? snapshots[0] ?? null)

  $effect(() => {
    if (selected && selectedId !== selected.id) selectedId = selected.id
  })

  function refresh() {
    const auto = runScheduledSnapshots()
    snapshots = loadSnapshots()
    if (auto.length) toastOk(`Auto-closed periods: ${auto.map((a) => a.label).join(', ')}`)
  }

  function closeCurrentMonth() {
    const pk = periodKey($currentMonth, $currentYear)
    if (hasSnapshot(pk, 'month')) {
      toastErr(`Period ${periodLabel($currentMonth, $currentYear)} has already been closed`)
      return
    }
    const s = createSnapshot('month', pk, periodLabel($currentMonth, $currentYear))
    if (!s) {
      toastErr('Failed to create monthly snapshot')
      return
    }
    snapshots = loadSnapshots()
    selectedId = s.id
    toastOk(`Period ${s.label} closed`)
  }

  function closeCurrentYear() {
    const y = String($currentYear)
    if (hasSnapshot(y, 'year')) {
      toastErr(`Year ${y} has already been closed`)
      return
    }
    const s = createSnapshot('year', y, `Year ${y}`)
    if (!s) {
      toastErr('Failed to create annual snapshot')
      return
    }
    snapshots = loadSnapshots()
    selectedId = s.id
    toastOk(`Year ${y} closed`)
  }

  async function syncLark() {
    if (!selected) {
      toastErr('Select a period snapshot to sync')
      return
    }
    const s = loadLarkSettings()
    if (!s.appId || !s.appSecret || !s.baseAppToken) {
      toastErr('Lark not configured — please contact admin')
      return
    }
    busy = true
    try {
      const r = await syncSnapshotToLark(selected, s)
      toastOk(
        `Lark Base — Office: ${r.office}, Trips: ${r.trips}, Commute: ${r.commute}${r.closeRows ? `, Summary: ${r.closeRows}` : ''}`,
      )
    } catch (e) {
      await showErrorDetail(e, 'Send to Lark Base (close period) failed')
    } finally {
      busy = false
    }
  }

  function onDelete(id) {
    deleteSnapshot(id)
    snapshots = loadSnapshots()
    if (selectedId === id) selectedId = snapshots[0]?.id ?? ''
    toastOk('Snapshot deleted')
  }

  refresh()
</script>

<div class="page-title">Close Period &amp; Summary</div>
<div class="page-sub">
  Automatically closes figures on the <strong>30th</strong> of each month and <strong>Dec 30</strong> for the full year. Data is saved as a snapshot (separate table) — can be synced to Lark Base.
</div>

<div class="card">
  <div class="card-head">
    <div class="card-head-left"><div class="card-title">Manual actions</div></div>
  </div>
  <div class="card-body actions-bar">
    <button type="button" class="btn btn-primary" onclick={closeCurrentMonth}>Close current month</button>
    <button type="button" class="btn" onclick={closeCurrentYear}>Close year {$currentYear}</button>
    <button type="button" class="btn" onclick={refresh}>Check auto-close (day 30)</button>
  </div>
</div>

<div class="close-layout">
  <div class="card">
    <div class="card-head">
      <div class="card-head-left"><div class="card-title">Saved snapshots</div></div>
    </div>
    <div class="card-body modal-body--scroll" style="max-height: 420px">
      {#if snapshots.length === 0}
        <p class="lark-preview-empty">No snapshots yet. The system will auto-create one on day 30, or click close manually.</p>
      {:else}
        <ul class="close-snap-list">
          {#each snapshots as snap}
            <li>
              <button
                type="button"
                class="close-snap-item"
                class:active={selected?.id === snap.id}
                onclick={() => (selectedId = snap.id)}
              >
                <strong>{snap.label}</strong>
                <span class="close-snap-meta">{snap.type === 'year' ? 'Year' : 'Month'} · {snap.closedAt.slice(0, 10)}</span>
              </button>
              <button type="button" class="btn btn-danger btn-sm" onclick={() => onDelete(snap.id)}>✕</button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <div class="card">
    <div class="card-head">
      <div class="card-head-left"><div class="card-title">Snapshot details</div></div>
      {#if selected}
        <button type="button" class="btn btn-primary" disabled={busy} onclick={syncLark}>
          {busy ? 'Sending…' : 'Send to Lark Base'}
        </button>
      {/if}
    </div>
    <div class="card-body">
      {#if !selected}
        <div class="empty"><div class="empty-icon">📦</div>Select or create a period snapshot</div>
      {:else}
        <p class="close-detail-intro">
          <strong>{selected.label}</strong> — closed at {new Date(selected.closedAt).toLocaleString('en-US')}
        </p>
        <div class="stat-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1rem">
          <div class="stat stat-danger">
            <div class="stat-label">Scope 1</div>
            <div class="stat-val">{selected.totals.s1.toFixed(3)}</div>
            <div class="stat-unit">tonnes</div>
          </div>
          <div class="stat stat-warn">
            <div class="stat-label">Scope 2</div>
            <div class="stat-val">{selected.totals.s2.toFixed(3)}</div>
            <div class="stat-unit">tonnes</div>
          </div>
          <div class="stat stat-info">
            <div class="stat-label">Scope 3</div>
            <div class="stat-val">{selected.totals.s3.toFixed(3)}</div>
            <div class="stat-unit">tonnes</div>
          </div>
          <div class="stat stat-accent">
            <div class="stat-label">Total</div>
            <div class="stat-val">{selected.totals.total.toFixed(3)}</div>
            <div class="stat-unit">tonnes</div>
          </div>
        </div>
        <p class="lark-preview-cols-hint">
          Data rows: Office {selected.equip.filter((r) => r.confirmed !== false).length} · Business trips
          {selected.emptrips.length} · Commute {selected.commute.length}
        </p>
        <table class="close-co-table">
          <thead>
            <tr>
              <th>Company</th>
              <th class="num">Total (tonnes)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>All</td>
              <td class="num">{snapshotTotalsForCompany(selected, '').total.toFixed(3)}</td>
            </tr>
            {#each COMPANIES as co}
              {@const t = snapshotTotalsForCompany(selected, co)}
              <tr>
                <td>{co}</td>
                <td class="num">{t.total.toFixed(3)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="lark-preview-cols-hint" style="margin-top: 12px">
          Lark: sends all 3 detail tables + summary table (if <code>VITE_LARK_TABLE_CLOSE</code> is set in env).
        </p>
      {/if}
    </div>
  </div>
</div>
