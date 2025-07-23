<script lang="ts">
  const { logItem } = $props();

  const logItemParts = logItem.split("\t");
  const category = logItemParts[0] || "";

  const descriptionWithNotes = logItemParts[1] || "";
  // Get notes out of "()" in description
  const notesMatch = descriptionWithNotes.match(/\(([^)]+)\)/);
  const notes = notesMatch ? notesMatch[1] : "";
  const description = descriptionWithNotes.replace(/\s*\([^)]*\)/, "").trim();

  const timeRange = logItemParts[2] || "";
</script>

<div class="time-log-item">
  <div class="category">{category}</div>
  <div class="description">{description}</div>

  {#if notes !== ""}
    <div class="notes">{notes}</div>
  {/if}
  <div class="time-range">{timeRange}</div>
</div>

<svelte:head>
  <style>
    .time-log-item {
      display: flex;
      flex-direction: column;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 5px;
    }

    .category {
      font-weight: bold;
      padding-bottom: 5px;
    }

    .time-range {
      font-weight: bold;
      padding-top: 5px;
    }

    .notes {
      color: silver;
      font-style: italic;
    }

    .category {
      font-weight: bold;
    }
  </style>
</svelte:head>
