<script>
  import { COMPANIES, ALL_COMPANIES } from '../lib/companies.js'

  let {
    value = $bindable(''),
    showAll = false,
    required = false,
    label = 'Company',
    hideLabel = false,
    id = 'company-select',
    compact = false,
    title = '',
  } = $props()
</script>

<div class="company-select-wrap" class:company-select-wrap--compact={compact}>
  {#if label && !hideLabel}
    <label class="company-select-label" for={id}>
      {label}
      {#if required}<span class="required">*</span>{/if}
    </label>
  {/if}
  <select
    {id}
    {title}
    class="company-select"
    class:company-select--compact={compact}
    bind:value
    {required}
    aria-label={hideLabel ? 'Select company' : label || 'Select company'}
  >
    {#if showAll}
      <option value={ALL_COMPANIES}>All companies</option>
    {:else if !required}
      <option value="">-- Select company --</option>
    {/if}
    {#each COMPANIES as co}
      <option value={co}>{co}</option>
    {/each}
  </select>
</div>
