<script>
  import { EMISSION_SOURCES, UNIT_OPTIONS } from '../lib/constants.js'
  import { COMPANIES, isValidCompany, matchesCompany } from '../lib/companies.js'
  import CompanySelect from './CompanySelect.svelte'
  import CompanyFilterBadge from './CompanyFilterBadge.svelte'
  import RowActionIcons from './RowActionIcons.svelte'
  import { get } from 'svelte/store'
  import {
    equipRows,
    offSettings,
    periodLabel,
    currentMonth,
    currentYear,
    setCompanyLocation,
    deleteEquipRow,
    addEquipRow,
    updateEquip,
    selectSource,
    isEquipInReport,
    selectedCompany,
  } from '../lib/ghg.js'
  import { confirmDanger, toastOk, confirmAction, toastErr } from '../lib/notify.js'

  let location = $state('')
  let defaultCompany = $state(COMPANIES[0])

  $effect(() => {
    const saved = $offSettings.company ?? ''
    if (isValidCompany(saved)) defaultCompany = saved
    location = $offSettings.location ?? ''
  })

  $effect(() => {
    if ($selectedCompany) defaultCompany = $selectedCompany
  })

  $effect(() => {
    if (!isValidCompany(defaultCompany)) return
    setCompanyLocation(defaultCompany, location)
  })

  function persistLocation() {
    if (!isValidCompany(defaultCompany)) return
    setCompanyLocation(defaultCompany, location)
  }

  const visibleEquipRows = $derived.by(() => {
    if (!$selectedCompany) return $equipRows
    return $equipRows.filter((r) => matchesCompany(r.company, $selectedCompany))
  })

  const officeTotals = $derived.by(() => {
    let s1 = 0
    let s2 = 0
    for (const r of visibleEquipRows) {
      if (!isEquipInReport(r)) continue
      const t = r.volume && r.ef ? (r.volume * r.ef) / 1000 : 0
      if (r.scope === 1) s1 += t
      else s2 += t
    }
    return { s1, s2 }
  })

  const confirmedEquipRows = $derived(visibleEquipRows.filter(isEquipInReport))

  /** Draft rows (not yet confirmed to summary) */
  const draftEquipRows = $derived(visibleEquipRows.filter((r) => r.confirmed === false))

  async function onDeleteRow(id) {
    const ok = await confirmDanger('Delete equipment row?', 'This action cannot be undone.', 'Delete')
    if (!ok) return
    deleteEquipRow(id)
    toastOk('Equipment row deleted')
  }

  async function onDeleteFromSummary(id) {
    const ok = await confirmDanger(
      'Remove from summary?',
      'The row will be permanently removed from the reporting period.',
      'Delete',
    )
    if (!ok) return
    deleteEquipRow(id)
    toastOk('Removed from summary')
  }

  function onEditFromSummary(id) {
    updateEquip(id, 'confirmed', false)
    toastOk('Row moved back to the input section above for editing')
  }

  function onAddRow() {
    addEquipRow()
    const rows = get(equipRows)
    const last = rows[rows.length - 1]
    if (last) updateEquip(last.id, 'company', defaultCompany)
  }

  async function onConfirmRow(row) {
    const fresh = get(equipRows).find((r) => r.id === row.id) ?? row
    if (!fresh.source?.trim()) {
      toastErr('Please select an emission source')
      return
    }
    if (!fresh.ef || fresh.ef <= 0) {
      toastErr('Please enter a valid emission factor (EF)')
      return
    }
    if (!fresh.volume || fresh.volume <= 0) {
      toastErr('Please enter a volume greater than 0')
      return
    }
    if (!isValidCompany(fresh.company || defaultCompany)) {
      toastErr('Please select a company')
      return
    }
    const ok = await confirmAction('Add to summary?', '')
    if (!ok) return
    updateEquip(fresh.id, 'confirmed', true)
    toastOk('Row added to the summary table below')
  }

  /** @param {string} id @param {string} raw */
  function setEquipNumber(id, key, raw) {
    const n = raw === '' ? 0 : Number(raw)
    updateEquip(id, key, Number.isFinite(n) ? n : 0)
  }
</script>

<div class="page-title">Stationary Combustion — Office</div>
<div class="page-sub">
  Fixed emission sources at office / facility · Scope 1 (direct combustion) &amp; Scope 2 (purchased electricity)
</div>

<div class="card">
  <div class="card-head">
    <div class="card-head-left"><div class="card-title">Reporting period info</div></div>
  </div>
  <div class="card-body g3">
    <div class="field">
      <label>Reporting period</label>
      <input
        type="text"
        readonly
        value={periodLabel($currentMonth, $currentYear)}
        style="background: var(--surface2); color: var(--text2); cursor: default"
      />
    </div>
    <div class="field">
      <label>Location / Facility</label>
      <input type="text" placeholder="Building XYZ, District 1, HCMC" bind:value={location} oninput={persistLocation} />
    </div>
    <div class="field">
      <label>Company (default for new rows)</label>
      <CompanySelect bind:value={defaultCompany} hideLabel={true} required={true} id="office-default-company" />
    </div>
  </div>
</div>

<div class="card">
  <div class="card-head">
    <div class="card-head-left">
      <div class="card-title">Equipment / emission source list</div>
      <CompanyFilterBadge />
      <span class="card-scope scope-s1" style="background:#fdecea;color:#c0392b">SCOPE 1 &amp; 2</span>
    </div>
    <button type="button" class="btn btn-add" onclick={onAddRow}>+ Add equipment row</button>
  </div>
  <div class="card-body eq-equipment-body">
    <div class="eq-grid eq-grid-header">
      <span>#</span>
      <span>Equipment</span>
      <span>Company</span>
      <span>Emission source</span>
      <span>Unit</span>
      <span>EF (kgCO₂e)</span>
      <span>EF Reference</span>
      <span>Volume</span>
      <span class="eq-header-confirm">Confirm</span>
      <span class="eq-header-del">Delete</span>
    </div>
    {#if draftEquipRows.length === 0}
      <div class="empty">
        <div class="empty-icon">⚙️</div>
        {#if $equipRows.length === 0}
          No equipment yet. Click "+ Add equipment row" to get started.
        {:else}
          No rows in draft — confirmed rows are in the summary table below. Click "+ Add equipment row" or
          <strong>Edit</strong> a row in the table below to make changes.
        {/if}
      </div>
    {:else}
      {#each draftEquipRows as row, i (row.id)}
        {@const total = row.volume && row.ef ? (row.volume * row.ef) / 1000 : 0}
        <div class="eq-row">
          <div class="eq-grid">
            <span
              style="font-family:var(--mono);font-size:11px;background:var(--text);color:#fff;border-radius:4px;padding:2px 7px;text-align:center"
              >{i + 1}</span
            >
            <input
              class="eq-span"
              type="text"
              placeholder="Air conditioner, generator..."
              value={row.equipment}
              oninput={(e) => updateEquip(row.id, 'equipment', e.currentTarget.value)}
            />
            <select
              class="eq-span company-select"
              value={row.company || defaultCompany}
              onchange={(e) => updateEquip(row.id, 'company', e.currentTarget.value)}
              required
              aria-label="Company"
            >
              {#each COMPANIES as co}
                <option value={co}>{co}</option>
              {/each}
            </select>
            <select
              class="eq-span"
              value={row.source}
              onchange={(e) => selectSource(row.id, e.currentTarget.value)}
            >
              <option value="">-- Select source --</option>
              {#each EMISSION_SOURCES as s}
                <option value={s.label}>{s.label}</option>
              {/each}
            </select>
            <select
              value={row.unit}
              onchange={(e) => updateEquip(row.id, 'unit', e.currentTarget.value)}
            >
              {#each UNIT_OPTIONS as u}
                <option>{u}</option>
              {/each}
            </select>
            <input
              type="number"
              placeholder="EF"
              value={row.ef || ''}
              step="any"
              oninput={(e) => setEquipNumber(row.id, 'ef', e.currentTarget.value)}
            />
            <input
              class="eq-span"
              type="text"
              placeholder="DEFRA 2023 / MONRE VN..."
              value={row.efRef}
              oninput={(e) => updateEquip(row.id, 'efRef', e.currentTarget.value)}
            />
            <input
              type="number"
              placeholder="Volume"
              value={row.volume || ''}
              min="0"
              step="any"
              oninput={(e) => setEquipNumber(row.id, 'volume', e.currentTarget.value)}
            />
            <div class="eq-confirm-cell">
              <button
                type="button"
                class="btn-tick"
                title="Confirm and add to summary table below"
                aria-label="Confirm equipment row"
                onclick={() => onConfirmRow(row)}
              >
                ✓
              </button>
            </div>
            <RowActionIcons onDelete={() => onDeleteRow(row.id)} deleteTitle="Delete draft row" />
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge {row.scope === 1 ? 'scope-s1' : 'scope-s2'}">Scope {row.scope}</span>
            <span class="eq-draft-pill">Not confirmed</span>
            {#if total > 0}
              <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">
                {row.volume} {row.unit} × {row.ef} kg/unit ÷ 1000 = {total.toFixed(4)} tonnes CO₂e
              </span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<div class="card">
  <div class="card-head">
    <div class="card-head-left">
      <div class="card-title">Office emissions summary</div>
      <CompanyFilterBadge />
    </div>
  </div>
  <div class="card-body">
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Equipment</th>
            <th>Company</th>
            <th>Emission source</th>
            <th>Scope</th>
            <th>Unit</th>
            <th>Volume</th>
            <th>EF</th>
            <th>Total GHG (tonnes CO₂e)</th>
            <th class="eq-summary-actions-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if confirmedEquipRows.length === 0}
            <tr>
              <td colspan="9" style="text-align:center;color:var(--text3);padding:1.5rem">
                {#if $equipRows.length === 0}
                  No data yet
                {:else if draftEquipRows.length > 0}
                  No rows in summary yet. Click ✓ on the rows above to add them here.
                {:else}
                  No confirmed rows yet.
                {/if}
              </td>
            </tr>
          {:else}
            {#each confirmedEquipRows as r}
              {@const tot = r.volume && r.ef ? (r.volume * r.ef) / 1000 : 0}
              <tr>
                <td>{r.equipment || '—'}</td>
                <td>{r.company || '—'}</td>
                <td>{r.source || '—'}</td>
                <td>
                  <span class="badge {r.scope === 1 ? 'scope-s1' : 'scope-s2'}">Scope {r.scope}</span>
                </td>
                <td>{r.unit || '—'}</td>
                <td class="num">{r.volume || 0}</td>
                <td class="num">{r.ef || 0}</td>
                <td class="num" style="font-weight:600;color:var(--accent)">{tot.toFixed(4)}</td>
                <td class="eq-summary-actions">
                  <RowActionIcons
                    onEdit={() => onEditFromSummary(r.id)}
                    onDelete={() => onDeleteFromSummary(r.id)}
                    editTitle="Edit — move to input section above"
                    deleteTitle="Remove from summary"
                  />
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    <div style="margin-top:1rem;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text2)">Scope 1 total:</span>
      <span class="badge badge-r">{officeTotals.s1.toFixed(4)} tonnes CO₂e</span>
      <span style="font-size:13px;color:var(--text2)">Scope 2 total:</span>
      <span class="badge badge-a">{officeTotals.s2.toFixed(4)} tonnes CO₂e</span>
    </div>
  </div>
</div>
