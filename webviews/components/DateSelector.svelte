<script lang="ts">
  import { onMount } from "svelte";

  const { dateChanged } = $props();

  let userSelectedOffset = 0;
  let date: Date = new Date();
  let yearMonth = $state("");
  let weekday = $state("");
  let day = $state("");
  let offset = $state("");

  onMount(() => {
    // Set the initial date when the component is mounted
    setDate();
  });

  function setDate() {
    const calendarDate = new Date(date);
    calendarDate.setDate(calendarDate.getDate() + userSelectedOffset);

    yearMonth = getYearMonth(calendarDate);
    weekday = getWeekday(calendarDate);
    day = getDay(calendarDate);
    offset = getOffset();

    dateChanged(calendarDate);
  }

  function getYearMonth(calendarDate: Date) {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
    };

    return calendarDate.toLocaleDateString(undefined, options);
  }

  function getWeekday(calendarDate: Date) {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
    };

    return calendarDate.toLocaleDateString(undefined, options);
  }

  function getDay(calendarDate: Date) {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
    };

    let returnString = calendarDate.toLocaleDateString(undefined, options);

    return returnString;
  }

  function getOffset() {
    let returnString = "";

    if (userSelectedOffset === 0) {
      returnString = "(Today)";
    } else if (userSelectedOffset === 1) {
      returnString = "(Tomorrow)";
    } else if (userSelectedOffset === -1) {
      returnString = "(Yesterday)";
    } else if (userSelectedOffset > 0) {
      returnString = `(+${userSelectedOffset} days)`;
    } else {
      // Minus sign is already part of negative number
      returnString = `(${userSelectedOffset} days)`;
    }
    return returnString;
  }

  setInterval(() => {
    const oldCalendarDate = date.getDay();

    date = new Date();

    if (date.getDay() !== oldCalendarDate && userSelectedOffset !== 0) {
      // If the date has changed while we were focused on another day, adjust the selected offset, so it's the same day
      userSelectedOffset += 1;
      setDate();
    }
  }, 1000);
</script>

<div class="selected-year-month">
  {yearMonth}
</div>

<div class="date-selector">
  <!-- make an arrow left button -->
  <button
    class="arrow-left"
    onclick={() => {
      userSelectedOffset -= 1;
      setDate();
    }}
  >
    &lt;
  </button>
  <div class="date-selection-display">
    <div class="selected-date">
      {day}
    </div>

    <div class="weekday">
      {weekday}
    </div>

    <div class="offset">
      {offset}
    </div>
  </div>
  <!-- make an arrow right button -->
  <button
    class="arrow-right"
    onclick={() => {
      userSelectedOffset += 1;
      setDate();
    }}
  >
    &gt;
  </button>
</div>

<svelte:head>
  <style>
    div.selected-year-month {
      font-size: 1.1em;
      font-weight: bold;
      margin-bottom: 5px;
      text-align: center;
    }

    .date-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      flex-direction: row;
      width: 100%;
      justify-content: space-between;
    }

    .arrow-left,
    .arrow-right {
      cursor: pointer;
      font-size: 1.2em;
      padding: 0 10px;
    }

    .date-selection-display {
      text-align: center;
    }

    .selected-date {
      font-size: 1.2em;
    }

    .weekday {
      font-size: 1em;
    }

    .offset {
      font-size: 0.8em;
      color: silver;
    }

    .selected-date,
    .weekday,
    .offset {
      margin: 5px 0;
    }
  </style>
</svelte:head>
