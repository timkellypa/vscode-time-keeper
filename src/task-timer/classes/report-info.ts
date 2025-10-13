import { formatDate, formatDuration, getDay1, getMinutesForTime, getDayIndex } from '../utils/date-utils'
import TimeLogFile from '../file/timelog-file'

export interface WeeklyData {
  totals: Record<string, number[]>
  projectTotals: Record<string, number[]>
  grandTotals: number[]
  dateContents: string[]
  openDays: boolean[]
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
    const projectTotals: Record<string, number[]> = {}
    const grandTotals: number[] = new Array(8).fill(0)
    const dateContents: string[] = new Array(7).fill('')
    const openDays: boolean[] = new Array(7).fill(false)

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
          openDays[i] = true
          return
        }
        const key = `${project}~${task}`
        if (totals[key] == null) {
          totals[key] = new Array(8).fill(0)
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

    return { totals, projectTotals, grandTotals, dateContents, openDays, currentDayIndex }
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
}

export default ReportInfo
