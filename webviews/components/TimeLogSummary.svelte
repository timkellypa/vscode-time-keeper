<script lang="ts">
  import { onMount } from "svelte";

  type SummaryItem = {
    projectName: string;
    dailyTime: number;
    weeklyTime: number;
  };

  /**
   * Duplicate of interface in report-info.ts, redefined here for type checking
   * without a cross-section import (which causes build issues).
   */
  interface WeeklyData {
    totals: Record<string, number[]>;
    projectTotals: Record<string, number[]>;
    grandTotals: number[];
    dateContents: string[];
    openDays: boolean[];
    currentDayIndex: number;
  }

  let projectSummaryTable = $state<SummaryItem[]>([]);

  onMount(() => {
    // Listen for messages from the webview
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.data.command === "updateWeeklyData") {
        const weeklyData = event.data.weeklyData;
        updateProjectSummary(weeklyData);
      }
    });
  });

  function updateProjectSummary(weeklyData: WeeklyData) {
    const projectTotals = weeklyData.projectTotals;
    const currentDayIndex = weeklyData.currentDayIndex;
    const summary: SummaryItem[] = [];

    for (const [projectName, times] of Object.entries(projectTotals)) {
      summary.push({
        projectName,
        dailyTime: times[currentDayIndex],
        weeklyTime: times[7],
      });
    }

    // Sort by project name
    summary.sort((a, b) => a.projectName.localeCompare(b.projectName));

    // add a row for grand total
    summary.push({
      projectName: "TOTAL",
      dailyTime: weeklyData.grandTotals[currentDayIndex],
      weeklyTime: weeklyData.grandTotals[7],
    });

    projectSummaryTable = summary;
  }
</script>

<div class="time-log-summary">
  {#each projectSummaryTable as summaryRow}
    <div class="time-log-summary-item">
      <div class="project-name">{summaryRow.projectName}</div>
      <div class="total-time">
        {Math.round((summaryRow.dailyTime / 60.0) * 100) / 100}
        <span class="weekly-total"
          >/ {Math.round((summaryRow.weeklyTime / 60.0) * 100) / 100} wk</span
        >
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
    .weekly-total {
      color: var(--vscode-foreground);
      opacity: 0.7;
      font-weight: normal;
      margin-left: 5px;
    }
  </style>
</svelte:head>
