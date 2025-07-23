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
  <button class="generate-weekly-report" onclick={generateWeeklyReport}>
    Generate Weekly Report
  </button>

  <button class="edit-time-log" onclick={editTimeLog}> Edit Time Log </button>

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
      margin-top: 20px;
      gap: 10px;
    }

    button {
      padding: 10px;
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
