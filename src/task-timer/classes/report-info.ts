import type * as vscode from 'vscode'
import { formatDate, formatDuration, getDay1, getMinutesForTime } from '../utils/date-utils'
import TimeLogFile from '../file/timelog-file'

class ReportInfo {
  context: vscode.ExtensionContext
  date: Date
  constructor (context: vscode.ExtensionContext, date: Date) {
    this.context = context
    this.date = new Date(date)
  }

  _collateWeeklyData (): Record<string, number[]> {
    // start us out on Monday
    const dt = getDay1(this.date)
    const totals: Record<string, number[]> = {}

    for (let i = 0; i < 7; ++i) {
      const file = new TimeLogFile(this.context, dt)

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
        const task = lineParts[1].replace(/\(.*\)/, '')

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

    const contentRows = Object.keys(weeklyData).map((key) => {
      let rowTotal = 0
      const row = weeklyData[key]

      let rowData = key.replace('~', ' - ')

      for (let i = 0; i < 7; ++i) {
        const currentValue = row[i]
        rowData += `,${formatDuration(currentValue)}`

        // track all totals
        rowTotal += currentValue
        overallTotal += currentValue
        dailyTotals[i] += currentValue
      }
      rowData += `,${formatDuration(rowTotal)}`

      return rowData
    }).join('\n')

    const totalRow = `TOTAL,${dailyTotals.map((total) => formatDuration(total)).join(',')},${formatDuration(overallTotal)}`

    return `${headerRow}\n${contentRows}\n${totalRow}`
  }
}

export default ReportInfo
