import { formatDate, formatDuration, getDay1, getMinutesForTime, getDayIndex } from '../utils/date-utils'
import TimeLogFile from '../file/timelog-file'

export interface WeeklyData {
  totals: Record<string, number[]>
  notes: Record<string, string[]>
  projectTotals: Record<string, number[]>
  grandTotals: number[]
  dateContents: string[]

  // Store the open time for each day, blank if not open.
  openDays: string[]
  currentDayIndex: number
}

class ReportInfo {
  rootFilePath: string
  date: Date
  constructor (rootFilePath: string, date: Date) {
    this.rootFilePath = rootFilePath
    this.date = new Date(date)
  }

  getWeeklyData (date: Date): WeeklyData {
    // start us out on Monday
    const dt = getDay1(date)
    const currentDayIndex = getDayIndex(date)
    const totals: Record<string, number[]> = {}
    const notes: Record<string, string[]> = {}
    const projectTotals: Record<string, number[]> = {}
    const grandTotals: number[] = new Array(8).fill(0)
    const dateContents: string[] = new Array(7).fill('')
    const openDays: string[] = new Array(7).fill('')

    for (let i = 0; i < 7; ++i) {
      const file = new TimeLogFile(this.rootFilePath, dt)

      const fileContents = file.getContents()

      if (fileContents == null) {
        dt.setDate(dt.getDate() + 1)
        continue
      }

      dateContents[i] = fileContents

      const lines = fileContents.split('\n')

      lines.forEach((line) => {
        const lineParts = line.split('\t')

        if (lineParts.length < 3) {
          return
        }

        const project = lineParts[0]
        const task = lineParts[1].replace(/\s*\(.*\)/, '')

        const timeParts = lineParts[2].split(' - ')

        if (timeParts.length < 2 || timeParts[1] === '') {
          openDays[i] = timeParts[0]
          return
        }
        const key = `${project}~${task}`
        if (totals[key] == null) {
          totals[key] = new Array(8).fill(0)
        }

        if (notes[key] == null) {
          notes[key] = []
        }

        if (lineParts[1].includes('(')) {
          const noteMatch = lineParts[1].match(/\((.*)\)$/)
          if (noteMatch != null && noteMatch.length > 1) {
            notes[key].push(noteMatch[1])
          }
        }

        const startTimeMinutes = getMinutesForTime(timeParts[0])
        const endTimeMinutes = getMinutesForTime(timeParts[1])
        const duration = endTimeMinutes - startTimeMinutes

        if (projectTotals[project] == null) {
          projectTotals[project] = new Array(8).fill(0)
        }
        projectTotals[project][i] += duration
        totals[key][i] += duration
        grandTotals[i] += duration

        projectTotals[project][7] += duration
        totals[key][7] += duration
        grandTotals[7] += duration
      })

      dt.setDate(dt.getDate() + 1)
    }

    return { totals, notes, projectTotals, grandTotals, dateContents, openDays, currentDayIndex }
  }

  toCSV (): string {
    const dt = getDay1(this.date)
    const { projectTotals, grandTotals, totals } = this.getWeeklyData(dt)

    let headerRow = ''

    for (let i = 0; i < 7; ++i) {
      headerRow += `,${formatDate(dt)}`
      dt.setDate(dt.getDate() + 1)
    }
    headerRow += ',TOTAL'

    const contentRows = Object.keys(totals).sort().map((key) => {
      const row = totals[key]

      let rowData = key.replace('~', ' - ')

      for (let i = 0; i < 7; ++i) {
        const currentValue = row[i]
        rowData += `,${formatDuration(currentValue)}`
      }
      rowData += `,${formatDuration(row[7])}`
      return rowData
    }).join('\n')

    const projectTotalHeaderRow = 'PROJECT TOTALS,,,,,,,,'

    const projectTotalRows = Object.keys(projectTotals).sort().map((projectName) => {
      const projectTotal = projectTotals[projectName]
      return `${projectName},${projectTotal.map((total) => formatDuration(total)).join(',')}`
    }).join('\n')

    const totalRow = `TOTAL,${grandTotals.map((total) => formatDuration(total)).join(',')}`

    return `${headerRow}\n${contentRows}\n\n${projectTotalHeaderRow}\n${projectTotalRows}\n\n${totalRow}`
  }

  /**
   * Get the notes for a given project and task name for the week of the report.
   * @param projectName project name
   * @param taskName task name
   * @returns Array of notes for the given project and task name for the week of the report date.
   * Note, this will contain duplicates of the same note, in case the caller
   * needs positional information (like earliest or latest).
   */
  getNotesForTask (projectName: string, taskName: string): string[] {
    const { notes } = this.getWeeklyData(this.date)
    const key = `${projectName}~${taskName}`
    return notes[key] ?? []
  }
}

export default ReportInfo
