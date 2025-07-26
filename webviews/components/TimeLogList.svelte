<script lang="ts">
  import TimeLogItem from "./TimeLogItem.svelte";

  const { pageContents } = $props();
</script>

<div class="time-log-list">
  {#each pageContents ? pageContents.split("\n") : [] as logItem}
    <!-- ensure timelog item updates correctly when logItem updates -->
    {#key logItem}
      <TimeLogItem {logItem} />
    {/key}
  {/each}
</div>

<svelte:head>
  <style>
    .time-log-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 5px;
    }
  </style>
</svelte:head>
