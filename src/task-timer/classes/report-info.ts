import { formatDate, formatDuration, getDay1, getMinutesForTime } from '../utils/date-utils'
import TimeLogFile from '../file/timelog-file'

class ReportInfo {
  rootFilePath: string
  date: Date
  constructor (rootFilePath: string, date: Date) {
    this.rootFilePath = rootFilePath
    this.date = new Date(date)
  }

  _collateWeeklyData (): Record<string, number[]> {
    // start us out on Monday
    const dt = getDay1(this.date)
    const totals: Record<string, number[]> = {}

    for (let i = 0; i < 7; ++i) {
      const file = new TimeLogFile(this.rootFilePath, dt)

      const fileContents = file.getContents()

      if (fileContents == null) {
        dt.setDate(dt.getDate() + 1)
        continue
      }

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
          return
        }
        const key = `${project}~${task}`
        if (totals[key] == null) {
          totals[key] = new Array(7).fill(0)
        }

        const startTimeMinutes = getMinutesForTime(timeParts[0])
        const endTimeMinutes = getMinutesForTime(timeParts[1])

        totals[key][i] += endTimeMinutes - startTimeMinutes
      })

      dt.setDate(dt.getDate() + 1)
    }

    return totals
  }

  toCSV (): string {
    const weeklyData = this._collateWeeklyData()

    const dt = getDay1(this.date)

    let headerRow = ''

    for (let i = 0; i < 7; ++i) {
      headerRow += `,${formatDate(dt)}`
      dt.setDate(dt.getDate() + 1)
    }
    headerRow += ',TOTAL'

    const dailyTotals: number[] = new Array(7).fill(0)
    let overallTotal = 0

    const projectTotals: Record<string, number[]> = {}

    const contentRows = Object.keys(weeklyData).sort().map((key) => {
      let rowTotal = 0
      const row = weeklyData[key]

      const projectName = key.split('~')[0]
      let rowData = key.replace('~', ' - ')

      if (projectTotals[projectName] == null) {
        projectTotals[projectName] = new Array(8).fill(0) as number[]
      }

      for (let i = 0; i < 7; ++i) {
        const currentValue = row[i]
        rowData += `,${formatDuration(currentValue)}`

        // track all totals
        rowTotal += currentValue
        overallTotal += currentValue
        dailyTotals[i] += currentValue

        const projectTotalsForProject = projectTotals[projectName]
        projectTotalsForProject[i] += currentValue
        projectTotalsForProject[7] += currentValue
      }
      rowData += `,${formatDuration(rowTotal)}`

      return rowData
    }).join('\n')

    const totalRow = `TOTAL,${dailyTotals.map((total) => formatDuration(total)).join(',')},${formatDuration(overallTotal)}`

    const projectTotalHeaderRow = 'PROJECT TOTALS,,,,,,,,'

    let projectTotalRows = ''
    for (const projectName of Object.keys(projectTotals).sort()) {
      const projectTotal = projectTotals[projectName]
      const projectTotalRow = `${projectName},${projectTotal.map((total) => formatDuration(total)).join(',')}`
      projectTotalRows += `${projectTotalRows.length === 0 ? '' : '\n'}${projectTotalRow}`
    }

    return `${headerRow}\n${contentRows}\n\n${projectTotalHeaderRow}\n${projectTotalRows}\n\n${totalRow}`
  }
}

export default ReportInfo
