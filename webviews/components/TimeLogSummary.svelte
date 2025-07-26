<script lang="ts">
  import { onMount } from "svelte";

  type SummaryItem = {
    projectName: string;
    totalTime: number;
  };

  let pageContents: string | null = $state(null);
  let projectSummaryTable = $state<SummaryItem[]>([]);

  onMount(() => {
    // Listen for messages from the webview
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.data.command === "updateDailyContents") {
        pageContents = event.data.contents ?? "";
        updateProjectSummary();
      }
    });
  });

  function updateProjectSummary() {
    const returnTable = [] as SummaryItem[];
    // reverse lookup of project name to array index in output
    const projectMap = new Map<string, number>();
    for (const row of pageContents ? pageContents.split("\n") : []) {
      const projectName = row.split("\t")[0] || "";
      let index = projectMap.get(projectName);
      if (index === undefined) {
        index = returnTable.length;
        projectMap.set(projectName, index);
        returnTable.push({ projectName, totalTime: 0 });
      }

      const timeRange = row.split("\t")[2] || "";
      const timeParts = timeRange.split("-");
      if (timeParts.length === 2) {
        const startTime = new Date(`1970-01-01T${timeParts[0].trim()}:00`);
        const endTime = new Date(`1970-01-01T${timeParts[1].trim()}:00`);
        const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // duration in minutes
        returnTable[index].totalTime += duration;
      }
    }

    projectSummaryTable = returnTable.sort((a, b) =>
      a.projectName.localeCompare(b.projectName),
    );
  }
</script>

<div class="time-log-summary">
  {#each projectSummaryTable as summaryRow}
    <div class="time-log-summary-item">
      <div class="project-name">{summaryRow.projectName}</div>
      <div class="total-time">
        {Math.round((summaryRow.totalTime / 60.0) * 100) / 100}
      </div>
    </div>
  {/each}
</div>

<svelte:head>
  <style>
    .time-log-summary {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 5px;
    }
    .time-log-summary-item {
      display: flex;
      justify-content: space-between;
      padding: 5px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    .project-name {
      font-weight: bold;
      flex: 1;
    }
    .total-time {
      font-weight: bold;
      flex: 0 0 100px;
      text-align: right;
    }
  </style>
</svelte:head>
