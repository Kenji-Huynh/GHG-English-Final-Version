<script>
  import { selectedCompany } from '../lib/ghg.js'
</script>

{#if $selectedCompany}
  <span class="company-filter-badge" title="Change company in the top bar">
    Filter: <strong>{$selectedCompany}</strong>
  </span>
{/if}
