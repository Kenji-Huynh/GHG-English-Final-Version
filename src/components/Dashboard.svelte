<script>
  import {
    dash,
    dashYear,
    currentMonth,
    currentYear,
    periodLabel,
    dashboardMode,
  } from '../lib/ghg.js'
  import BarBlock from './BarBlock.svelte'

  const dashView = $derived($dashboardMode === 'year' ? $dashYear : $dash)
</script>

<div class="page-title">GHG Emissions Overview</div>
<div class="page-sub">
  {#if $dashboardMode === 'year'}
    Year <strong>{$currentYear}</strong>
  {:else}
    Period <strong>{periodLabel($currentMonth, $currentYear)}</strong>
  {/if}
</div>

<div class="dash-toolbar card">
  <div class="card-body dash-toolbar-inner">
    <div class="field">
      <label>View mode</label>
      <div class="dash-mode-toggle">
        <button
          type="button"
          class="btn btn-sm"
          class:btn-primary={$dashboardMode === 'month'}
          onclick={() => dashboardMode.set('month')}
        >
          Monthly
        </button>
        <button
          type="button"
          class="btn btn-sm"
          class:btn-primary={$dashboardMode === 'year'}
          onclick={() => dashboardMode.set('year')}
        >
          Annual
        </button>
      </div>
    </div>
  </div>
</div>

<div class="stat-grid">
  <div class="stat stat-accent">
    <div class="stat-label">Total CO₂e</div>
    <div class="stat-val">{dashView.total}</div>
    <div class="stat-unit">tonnes CO₂e</div>
  </div>
  <div class="stat stat-danger">
    <div class="stat-label">Scope 1 · Direct</div>
    <div class="stat-val">{dashView.s1}</div>
    <div class="stat-unit">tonnes CO₂e</div>
  </div>
  <div class="stat stat-warn">
    <div class="stat-label">Scope 2 · Indirect</div>
    <div class="stat-val">{dashView.s2}</div>
    <div class="stat-unit">tonnes CO₂e</div>
  </div>
  <div class="stat stat-info">
    <div class="stat-label">Scope 3 · Value chain</div>
    <div class="stat-val">{dashView.s3}</div>
    <div class="stat-unit">tonnes CO₂e</div>
  </div>
</div>

{#if $dashboardMode === 'year' && dashView.monthly}
  <div class="card">
    <div class="card-head">
      <div class="card-head-left">
        <div class="card-title">Monthly emissions — {$currentYear}</div>
      </div>
    </div>
    <div class="card-body">
      {#each dashView.monthly as m}
        <BarBlock
          label={m.label}
          val={m.total}
          max={dashView.maxM}
          color="#1A6B3C"
          suffix=" t"
        />
      {/each}
    </div>
  </div>
{/if}

<div class="dash-grid">
  <div class="card">
    <div class="card-head">
      <div class="card-head-left"><div class="card-title">Emissions by source</div></div>
    </div>
    <div class="card-body">
      {#if dashView.sources.length === 0}
        <div class="empty"><div class="empty-icon">📊</div>No data yet</div>
      {:else}
        {#each dashView.sources as s}
          <BarBlock
            label={s[0]}
            val={s[1]}
            max={dashView.maxS}
            color={s[2]}
            pct={true}
            total={dashView.totalTon}
          />
        {/each}
      {/if}
    </div>
  </div>
  <div class="card">
    <div class="card-head">
      <div class="card-head-left"><div class="card-title">Top emission sources</div></div>
    </div>
    <div class="card-body">
      {#if dashView.allItems.length === 0}
        <div class="empty"><div class="empty-icon">📋</div>No data yet</div>
      {:else}
        {#each dashView.allItems as a}
          <BarBlock label={a.label} val={a.val} max={dashView.maxA} color="#1A6B3C" suffix=" t" />
        {/each}
      {/if}
    </div>
  </div>
  <div class="card">
    <div class="card-head">
      <div class="card-head-left"><div class="card-title">Emissions by department (Scope 3)</div></div>
    </div>
    <div class="card-body">
      {#if dashView.deptArr.length === 0}
        <div class="empty"><div class="empty-icon">🏢</div>No data yet</div>
      {:else}
        {#each dashView.deptArr as d}
          <BarBlock label={d[0]} val={d[1]} max={dashView.maxD} color="#1B4F8A" suffix=" t" />
        {/each}
      {/if}
    </div>
  </div>
  <div class="card">
    <div class="card-head">
      <div class="card-head-left"><div class="card-title">Stationary Combustion — Scope 1 &amp; 2</div></div>
    </div>
    <div class="card-body">
      {#if dashView.offItems.length === 0}
        <div class="empty"><div class="empty-icon">🏭</div>No data yet</div>
      {:else}
        {#each dashView.offItems as o}
          <BarBlock
            label={o.label}
            val={o.val}
            max={dashView.maxO}
            color={o.scope === 1 ? '#C0392B' : '#B85C00'}
            suffix=" t"
          />
        {/each}
      {/if}
    </div>
  </div>
</div>
