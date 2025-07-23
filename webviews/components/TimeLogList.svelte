<script lang="ts">
  import TimeLogItem from "./TimeLogItem.svelte";

  let { pageContents, hasOpenValue = $bindable() } = $props();

  function checkOpenValue() {
    let openValue: boolean;
    if (pageContents && pageContents.trim().endsWith("-")) {
      openValue = true;
    } else {
      openValue = false;
    }

    if (openValue !== hasOpenValue) {
      hasOpenValue = openValue;
    }
  }

  $effect(() => checkOpenValue());
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
      gap: 10px;
      padding: 10px;
    }
  </style>
</svelte:head>
