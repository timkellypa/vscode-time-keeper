<script lang="ts">
  const {
    generateWeeklyReport,
    editTimeLog,
    addTimeEntry,
    stopTask,
    hasOpenValue,
  } = $props();
</script>

<div class="action-buttons">
  {#if !hasOpenValue}
    <button class="add-time-entry" onclick={addTimeEntry}>
      Add Time Entry
    </button>
  {:else}
    <button class="stop-task" onclick={stopTask}> Stop Task </button>
  {/if}
</div>

<svelte:head>
  <style>
    .action-buttons {
      display: flex;
      justify-content: space-between;
      flex-direction: column;
      margin-top: 10px;
      gap: 5px;
    }

    button {
      padding: 8px;
      background-color: #007acc;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }

    button:hover {
      background-color: #005f99;
    }
  </style>
</svelte:head>
