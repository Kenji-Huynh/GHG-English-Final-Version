<script>
  import { get } from 'svelte/store'
  import {
    currentMonth,
    currentYear,
    activePage,
    setPeriod,
    setActivePage,
    getPeriodKeys,
    shiftPeriod,
    exportBackupJSON,
    downloadText,
    downloadBlob,
    importBackup,
    currentPK,
    periodLabel,
    periodTotalsForKey,
    selectedCompany,
  } from './lib/ghg.js'
  import CompanySelect from './components/CompanySelect.svelte'
  import { exportCurrentPeriodExcel, exportPeriodExcelTemplate } from './lib/exportPeriodExcel.js'
  import {
    previewPeriodExcelImport,
    importPeriodExcelAndApply,
  } from './lib/importPeriodExcel.js'
  import { toastOk, confirmAction, confirmImportExcelMode, toastErr } from './lib/notify.js'
  import Dashboard from './components/Dashboard.svelte'
  import OfficePage from './components/OfficePage.svelte'
  import EmployeePage from './components/EmployeePage.svelte'
  import CommutePage from './components/CommutePage.svelte'
  import LarkSyncModal from './components/LarkSyncModal.svelte'
  import ClosePeriodPage from './components/ClosePeriodPage.svelte'

  let showPeriodsModal = $state(false)
  let showLarkModal = $state(false)
  /** @type {HTMLInputElement | undefined} */
  let importInput = $state()
  /** @type {HTMLInputElement | undefined} */
  let importExcelInput = $state()

  const yearOptions = $derived.by(() => {
    const y = new Date().getFullYear()
    const arr = []
    for (let i = y - 3; i <= y + 2; i++) arr.push(i)
    return arr
  })

  /** @param {Event} e */
  function onMonthChange(e) {
    const m = +/** @type {HTMLSelectElement} */ (e.currentTarget).value
    setPeriod(m, get(currentYear))
    toastOk(`Switched to ${periodLabel(m, get(currentYear))}`)
  }

  /** @param {Event} e */
  function onYearChange(e) {
    const y = +/** @type {HTMLSelectElement} */ (e.currentTarget).value
    setPeriod(get(currentMonth), y)
    toastOk(`Switched to ${periodLabel(get(currentMonth), y)}`)
  }

  async function shift(delta) {
    shiftPeriod(delta)
    toastOk(`Switched to ${periodLabel(get(currentMonth), get(currentYear))}`)
  }

  async function exportExcel() {
    try {
      const { buffer, filename } = await exportCurrentPeriodExcel()
      downloadBlob(
        buffer,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toastOk(`Excel exported — ${periodLabel(get(currentMonth), get(currentYear))}`)
    } catch (err) {
      console.error(err)
      toastErr('Failed to generate Excel file. Please try again.')
    }
  }

  async function downloadExcelTemplate() {
    try {
      const { buffer, filename } = await exportPeriodExcelTemplate()
      downloadBlob(
        buffer,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      toastOk('Excel template downloaded — fill in data then use Import Excel')
    } catch (err) {
      console.error(err)
      toastErr('Failed to generate template file.')
    }
  }

  function triggerExcelImport() {
    importExcelInput?.click()
  }

  /** @param {Event} e */
  async function onImportExcelFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.currentTarget)
    const file = input.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const { html } = await previewPeriodExcelImport(buf)
      const mode = await confirmImportExcelMode(html)
      if (!mode) {
        input.value = ''
        return
      }
      const r = await importPeriodExcelAndApply(buf, { mode })
      const added = []
      if (r.addedEquip > 0) added.push(`+${r.addedEquip} office`)
      if (r.addedTrips > 0) added.push(`+${r.addedTrips} trips`)
      if (r.addedCommutes > 0) added.push(`+${r.addedCommutes} commutes`)
      const skipped = []
      if (r.skippedEquip > 0) skipped.push(`Office duplicates: ${r.skippedEquip}`)
      if (r.skippedTrips > 0) skipped.push(`Trip duplicates: ${r.skippedTrips}`)
      if (r.skippedCommutes > 0) skipped.push(`Commute duplicates: ${r.skippedCommutes}`)
      const modeLabel = mode === 'replace' ? 'Replace' : 'Merge'
      let msg = `${modeLabel}: ${added.length ? added.join(' · ') : 'no new rows'}`
      if (skipped.length) msg += ` (${skipped.join(' · ')})`
      if (r.warnings.length) {
        toastOk(msg)
        toastErr(`Warning: ${r.warnings.slice(0, 2).join(' · ')}${r.warnings.length > 2 ? '…' : ''}`)
      } else {
        toastOk(msg)
      }
    } catch (err) {
      console.error(err)
      toastErr(/** @type {Error} */ (err).message || 'Excel import failed')
    }
    input.value = ''
  }

  function exportJson() {
    const { json, filename } = exportBackupJSON()
    downloadText(json, filename, 'application/json')
    toastOk(`Backed up all ${getPeriodKeys().length} periods to JSON`)
  }

  function triggerImport() {
    importInput?.click()
  }

  /** @param {Event} e */
  async function onImportFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.currentTarget)
    const file = input.files?.[0]
    if (!file) return
    const ok = await confirmAction(
      'Restore data from file?',
      'Data in the file will overwrite local storage per period. Consider backing up JSON first.',
    )
    if (!ok) {
      input.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(/** @type {string} */ (reader.result))
        importBackup(data)
        toastOk('Import successful — data restored')
      } catch {
        toastErr('Invalid file')
      }
      input.value = ''
    }
    reader.readAsText(file)
  }

  function jumpToPeriod(/** @type {number} */ m, /** @type {number} */ y) {
    showPeriodsModal = false
    setPeriod(m, y)
    toastOk(`Switched to ${periodLabel(m, y)}`)
  }
</script>

<input
  bind:this={importInput}
  type="file"
  accept=".json"
  style="display:none"
  onchange={onImportFile}
/>

<input
  bind:this={importExcelInput}
  type="file"
  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  style="display:none"
  onchange={onImportExcelFile}
/>

<div class="top-bar">
  <div class="logo">GHG<span>.</span>INVENTORY</div>
  <div class="period-controls">
    <button type="button" class="btn-period" onclick={() => shift(-1)} aria-label="Previous period">‹</button>
    <select value={$currentMonth} onchange={onMonthChange}>
      {#each Array(12) as _, i}
        <option value={i + 1}>Month {i + 1}</option>
      {/each}
    </select>
    <select value={$currentYear} onchange={onYearChange}>
      {#each yearOptions as y}
        <option value={y}>{y}</option>
      {/each}
    </select>
    <button type="button" class="btn-period" onclick={() => shift(1)} aria-label="Next period">›</button>
    <span class="period-active" title="All data entered / saved / synced to Lark belongs to this period">
      Active period: <strong>{periodLabel($currentMonth, $currentYear)}</strong>
    </span>
    <span class="period-badge" title="Number of periods with data">{getPeriodKeys().length} periods</span>
    <CompanySelect
      bind:value={$selectedCompany}
      showAll={true}
      hideLabel={true}
      compact={true}
      id="global-company"
      title="Filter by company — All companies = show all"
    />
  </div>
  <aside class="top-bar-right data-toolbar" aria-label="Export reports and backup data">
    <p class="data-toolbar-hint">
      Excel: export / template / import this period · JSON: backup all periods
    </p>
    <div class="data-toolbar-row">
      <button
        type="button"
        class="btn-data btn-data--excel"
        title="Excel workbook: Overview, Office S1–S2, Business Trips, Commute"
        onclick={exportExcel}
      >
        Export Excel (.xlsx)
      </button>
      <button
        type="button"
        class="btn-data"
        title="Blank file with same sheets and column headers as the export — use for manual entry"
        onclick={downloadExcelTemplate}
      >
        Excel Template
      </button>
      <button
        type="button"
        class="btn-data"
        title="Upload .xlsx file (template / export) — preview, merge or replace by sheet"
        onclick={triggerExcelImport}
      >
        Import Excel
      </button>
      <button
        type="button"
        class="btn-data"
        title="Includes all periods with data and company / facility info"
        onclick={exportJson}
      >
        Backup JSON
      </button>
      <button
        type="button"
        class="btn-data"
        title="Select backup file — will overwrite local data per period from file"
        onclick={triggerImport}
      >
        Restore JSON
      </button>
      <span class="data-toolbar-sep" aria-hidden="true"></span>
      <button type="button" class="btn-data btn-data--ghost" onclick={() => (showPeriodsModal = true)}>
        Reporting Periods
        <span class="btn-data-badge">{getPeriodKeys().length}</span>
      </button>
      <span class="data-toolbar-sep" aria-hidden="true"></span>
      <button
        type="button"
        class="btn-data btn-data--ghost"
        title="Send current period data to Lark Base (Bitable)"
        onclick={() => (showLarkModal = true)}
      >
        Lark Base
      </button>
    </div>
  </aside>
</div>

<LarkSyncModal bind:open={showLarkModal} />

<div class="nav">
  <button type="button" class="nav-tab" class:active={$activePage === 'dashboard'} onclick={() => setActivePage('dashboard')}>
    Dashboard
  </button>
  <button type="button" class="nav-tab" class:active={$activePage === 'office'} onclick={() => setActivePage('office')}>
    Office (Scope 1 &amp; 2)
  </button>
  <button type="button" class="nav-tab" class:active={$activePage === 'employee'} onclick={() => setActivePage('employee')}>
    Employees (Scope 3)
  </button>
  <button type="button" class="nav-tab" class:active={$activePage === 'commute'} onclick={() => setActivePage('commute')}>
    Daily Commute
  </button>
  <button type="button" class="nav-tab" class:active={$activePage === 'close'} onclick={() => setActivePage('close')}>
    Close Period
  </button>
</div>

{#if showPeriodsModal}
  <div
    class="modal-overlay"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && (showPeriodsModal = false)}
    onkeydown={(e) => e.key === 'Escape' && (showPeriodsModal = false)}
  >
    <div class="modal" style="width: min(680px, 100%)">
      <div class="modal-head">
        <span class="modal-title">All Reporting Periods</span>
        <button type="button" class="modal-close" onclick={() => (showPeriodsModal = false)} aria-label="Close">×</button>
      </div>
      <div class="modal-body modal-body--scroll">
        <table class="periods-modal-table">
          <thead>
            <tr>
              <th>Reporting Period</th>
              <th class="num">Scope 1+2 (tonnes)</th>
              <th class="num">Scope 3 (tonnes)</th>
              <th class="num">Total (tonnes)</th>
              <th class="periods-modal-th-actions"></th>
            </tr>
          </thead>
          <tbody>
            {#each getPeriodKeys() as pk}
              {@const [py, pm] = pk.split('-').map(Number)}
              {@const t = periodTotalsForKey(pk)}
              {@const isCur = pk === currentPK()}
              <tr class:periods-modal-row--current={isCur}>
                <td class="periods-modal-period">
                  {periodLabel(pm, py)}{#if isCur}<span class="periods-modal-current-tag">Current</span>{/if}
                </td>
                <td class="num">{t.s12.toFixed(3)}</td>
                <td class="num">{t.s3.toFixed(3)}</td>
                <td class="num periods-modal-total">{t.total.toFixed(3)}</td>
                <td class="periods-modal-actions">
                  <button type="button" class="btn btn-sm btn-primary" onclick={() => jumpToPeriod(pm, py)}>Open</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn" onclick={() => (showPeriodsModal = false)}>Close</button>
      </div>
    </div>
  </div>
{/if}

<div class="page">
  {#if $activePage === 'dashboard'}
    <Dashboard />
  {:else if $activePage === 'office'}
    <OfficePage />
  {:else if $activePage === 'employee'}
    <EmployeePage />
  {:else if $activePage === 'commute'}
    <CommutePage />
  {:else}
    <ClosePeriodPage />
  {/if}
</div>
