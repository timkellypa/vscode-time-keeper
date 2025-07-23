<script lang="ts">
  import { onMount } from "svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import DateSelector from "./DateSelector.svelte";
  import TimeLogList from "./TimeLogList.svelte";

  let pageContents: string | null = $state(null);
  let hasOpenValue = $state(false);

  function dateChanged(date: Date = new Date()) {
    const calendarDate = new Date(date);

    const year = calendarDate.getFullYear();
    const month = String(calendarDate.getMonth() + 1).padStart(2, "0");
    const day = String(calendarDate.getDate()).padStart(2, "0");

    // tsvscode is a global variable provided by script in the outer HTML.
    // @ts-ignore
    tsvscode.postMessage({
      command: "setCalendarDate",
      date: `${year}-${month}-${day}`,
    });
  }

  onMount(() => {
    // Listen for messages from the webview
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.data.command === "pageContents") {
        pageContents = event.data.contents;
      }
    });
  });

  function addTimeEntry() {
    // @ts-ignore
    tsvscode.postMessage({ command: "addTimeEntry" });
  }

  function stopTask() {
    // @ts-ignore
    tsvscode.postMessage({ command: "stopTask" });
  }

  function editTimeLog() {
    // @ts-ignore
    tsvscode.postMessage({ command: "editTimeLog" });
  }

  function generateWeeklyReport() {
    // @ts-ignore
    tsvscode.postMessage({ command: "generateWeeklyReport" });
  }
</script>

<DateSelector {dateChanged} />

{#key hasOpenValue}
  <ActionButtons
    {generateWeeklyReport}
    {editTimeLog}
    {addTimeEntry}
    {stopTask}
    {hasOpenValue}
  />
{/key}

<TimeLogList {pageContents} bind:hasOpenValue />

<svelte:head>
  <style>
  </style>
</svelte:head>
