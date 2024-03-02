import * as vscode from 'vscode'
import fs from 'fs'
import InputUtils from './ui/InputUtils'

const defaultInterval = 15
const defaultProjectTaskList = {}
const defaultAddNotes = true

// 1 means day 1 is Monday.  0 would be Sunday
const day1Offset = 1

const padNumber = (num: number, places: number): string => {
  let strNum = num.toString()
  for (let i = strNum.length; i < places; ++i) {
    strNum = `0${strNum}`
  }
  return strNum
}
const fileFormat = 'utf-8'

class TaskTimer {
  context: vscode.ExtensionContext

  get interval (): number {
    return vscode.workspace.getConfiguration('TimeKeeper').get('TimeInterval') ?? defaultInterval
  }

  get projectTaskList (): Record<string, string> {
    return vscode.workspace.getConfiguration('TimeKeeper').get('ProjectTasks') ?? defaultProjectTaskList
  }

  get canAddNotes (): boolean {
    return vscode.workspace.getConfiguration('TimeKeeper').get('AddNotes') ?? defaultAddNotes
  }

  constructor (vscodeContext: vscode.ExtensionContext) {
    this.context = vscodeContext
  }

  _convertPathToUrl (path: string): string {
    const storageDirectory = this.context.globalStorageUri.fsPath
    const storageUrl = this.context.globalStorageUri.path
    const url = path.replace(storageDirectory, storageUrl)
    return `file://${url}`.replace(/ /g, '%20')
  }

  _getTimesheetRootPath (): string {
    const storageDirectory = this.context.globalStorageUri.fsPath
    const rootDirectory = `${storageDirectory}/timesheets`

    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory, { recursive: true })
    }

    return rootDirectory
  }

  _getTimeSheetReportsPath (): string {
    const rootDirectory = this._getTimesheetRootPath()
    const reportsPath = `${rootDirectory}/reports`

    if (!fs.existsSync(reportsPath)) {
      fs.mkdirSync(reportsPath, { recursive: true })
    }

    return reportsPath
  }

  /**
   * Return ISO format for date, in local time.
   * @param date the date to format
   * @returns ISO formatted date YYYY-MM-DD
   */
  _formatDate (date: Date): string {
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1, 2)}-${padNumber(date.getDate(), 2)}`
  }

  _formatDuration (minutes: number, blankIfZero: boolean = false): string {
    if (minutes === 0 && blankIfZero) {
      return ''
    }
    // show with max of 2 decimal places, rounded.
    return `${(Math.round(minutes * 100 / 60.0) / 100)}`
  }

  _getFileByDate (date = new Date()): string {
    const dtString = this._formatDate(date)
    const dtFile = `${this._getTimesheetRootPath()}/${dtString}.txt`

    return dtFile
  }

  _getReportFileByDate (date = new Date()): string {
    const day1Dt = this._getDay1(date)
    const day7Dt = this._getDay7(date)

    const dtString = `${this._formatDate(day1Dt)} - ${this._formatDate(day7Dt)}`
    const dtFile = `${this._getTimeSheetReportsPath()}/${dtString}.csv`

    return dtFile
  }

  _getCurrentTime (): string {
    const dt = new Date()
    const hour = dt.getHours()
    const minute = dt.getMinutes()
    return `${padNumber(hour, 2)}:${padNumber(minute, 2)}`
  }

  _getClosestIntervalToCurrentTime (): string {
    const currentTime = this._getCurrentTime()
    const currentTimeParts = currentTime.split(':').map((timePart) => parseInt(timePart, 10))
    const currentMinuteTotal = currentTimeParts[0] * 60 + currentTimeParts[1]

    let absDifference: number | null = null

    // start with current hour, find closest absolute value difference
    for (let h = currentTimeParts[0]; h <= currentTimeParts[0] + 1; ++h) {
      for (let m = 0; m < 60; m += this.interval) {
        const oldDiff = absDifference
        absDifference = Math.abs(currentMinuteTotal - (h * 60 + m))

        // When absolute value decreases, we've found the closest value, the previous once
        if (oldDiff != null && oldDiff <= absDifference) {
          return `${padNumber(h, 2)}:${padNumber(m - this.interval, 2)}`
        }
      }
    }

    throw new Error(`Unexpected State:  Closest Current Interval not found!  Current Time=${currentTime}`)
  }

  _getMinutesForTime (time: string): number {
    const timeParts = time.split(':')
    return parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1] ?? 0, 10)
  }

  _taskIsOpen (fileContents: string): boolean {
    return fileContents.endsWith('- ')
  }

  _getTimeOptions (minTime: string = '00:00'): string[] {
    let times = []

    for (let h = 0; h < 24; ++h) {
      for (let m = 0; m < 60; m += this.interval) {
        if (this._getMinutesForTime(minTime) <= h * 60 + m) {
          times.push(`${padNumber(h, 2)}:${padNumber(m, 2)}`)
        }
      }
    }

    // Put the current time first, so it is the first thing a user can select.
    const currentTime = this._getClosestIntervalToCurrentTime()
    const endOfArray = times.splice(0, times.indexOf(currentTime))
    times = times.concat(endOfArray)
    return times
  }

  async startTask (): Promise<void> {
    // stop any currently running tasks with the current date and time (no user input)
    await this.stopTask(false)

    const projectOptions = Object.keys(this.projectTaskList).sort()
    const project = await InputUtils.getUserValueWithSuggestions(projectOptions, 'Project Name', true)

    if (project == null) {
      return
    }

    const taskOptions = (this.projectTaskList[project] ?? '').split(',').map((taskName) => taskName.trim())
    const taskName = await InputUtils.getUserValueWithSuggestions(taskOptions, 'Task Name', true)

    if (taskName == null) {
      return
    }

    const timeOptions = this._getTimeOptions()
    const startTime = await vscode.window.showQuickPick(timeOptions, { title: 'Start Time', ignoreFocusOut: true })

    if (startTime == null) {
      return
    }

    let fullTask = taskName
    if (this.canAddNotes) {
      // Allow user to escape or unfocus here and still enter time.
      // But only add notes if user actually enters them.
      const additionalNotes = await vscode.window.showInputBox({ placeHolder: 'Notes' })

      if (additionalNotes != null && additionalNotes !== '') {
        fullTask = `${fullTask} (${additionalNotes})`
      }
    }

    const file = this._getFileByDate()

    const fileBefore = fs.existsSync(file) ? `${fs.readFileSync(file, fileFormat)}\n` : ''
    const newContents = `${fileBefore}${project}\t${fullTask}\t${startTime} - `
    fs.writeFileSync(file, newContents, fileFormat)

    void vscode.window.showInformationMessage('Task Started', { detail: newContents }, 'OK', 'Edit Manually')
      .then((selection) => {
        if (selection === 'Edit Manually') {
          void vscode.window.showTextDocument(vscode.Uri.file(file))
        }
      })
  }

  async stopTask (checkUserInput: boolean = true): Promise<void> {
    // check to see if a task is open.
    let file = this._getFileByDate()
    let isYesterday = false
    if (!fs.existsSync(file)) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      file = this._getFileByDate(yesterday)
      isYesterday = true
    }
    if (!fs.existsSync(file)) {
      return
    }
    let fileContents = fs.readFileSync(file, fileFormat)
    if (!this._taskIsOpen(fileContents)) {
      return
    }

    if (isYesterday) {
      // if yesterday is open, leave with 24:00
      const newFileContents = `${fileContents}24:00`
      fs.writeFileSync(file, newFileContents)

      // create a row for today.
      const yesterdayRows = newFileContents.split('\n')
      const lastRowForYesterday = yesterdayRows[yesterdayRows.length - 1]
      const lastRowParts = lastRowForYesterday.split('\t')
      lastRowParts.splice(lastRowParts.length - 1, 1)
      const lastRowWithoutTimes = lastRowParts.join('\t')

      const todayOpenTaskRow = `${lastRowWithoutTimes}\t00:00 - `

      file = this._getFileByDate()
      fileContents = todayOpenTaskRow
      fs.writeFileSync(file, fileContents, fileFormat)
    }

    const currentTime = this._getClosestIntervalToCurrentTime()

    const lines = fileContents.split('\n')
    const lastLine = lines[lines.length - 1]
    const lineParts = lastLine.split('\t')
    const startTime = lineParts[lineParts.length - 1].replace(' -', '')

    const timeOptions = this._getTimeOptions(startTime)

    const endTime = !checkUserInput
      ? currentTime
      : (await vscode.window.showQuickPick(timeOptions, { placeHolder: 'End Time', title: lastLine }))

    if (endTime == null) {
      return
    }

    const newContents = `${fileContents}${endTime}`
    fs.writeFileSync(file, newContents, fileFormat)

    const newContentsLines = newContents.split('\n')
    const stoppedTaskInfo = newContentsLines[newContentsLines.length - 1]
    void vscode.window.showInformationMessage('Task Stopped', { detail: stoppedTaskInfo }, 'OK', 'Edit Manually')
      .then((selection) => {
        if (selection === 'Edit Manually') {
          void vscode.window.showTextDocument(vscode.Uri.file(file))
        }
      })
  }

  /**
   * Get the beginning of the week (Monday?)
   */
  _getDay1 (dt: Date): Date {
    const returnDate = new Date(dt)
    returnDate.setDate(returnDate.getDate() - returnDate.getDay() + day1Offset)
    return returnDate
  }

  _getDay7 (dt: Date): Date {
    const returnDate = new Date(dt)
    returnDate.setDate(returnDate.getDate() - returnDate.getDay() + day1Offset + 7)
    return returnDate
  }

  _collateWeeklyData (dtSelected: Date): Record<string, number[]> {
    // start us out on Monday
    const dt = this._getDay1(dtSelected)
    const totals: Record<string, number[]> = {}

    for (let i = 0; i < 7; ++i) {
      const file = this._getFileByDate(dt)

      if (!fs.existsSync(file)) {
        dt.setDate(dt.getDate() + 1)
        continue
      }
      const fileContents = fs.readFileSync(file, fileFormat)

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

        const startTimeMinutes = this._getMinutesForTime(timeParts[0])
        const endTimeMinutes = this._getMinutesForTime(timeParts[1])

        totals[key][i] += endTimeMinutes - startTimeMinutes
      })

      dt.setDate(dt.getDate() + 1)
    }

    return totals
  }

  _generateWeeklyDataCSV (weeklyData: Record<string, number[]>, dtSelected: Date): string {
    const dt = this._getDay1(dtSelected)

    let headerRow = ''

    for (let i = 0; i < 7; ++i) {
      headerRow += `,${this._formatDate(dt)}`
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
        rowData += `,${this._formatDuration(currentValue)}`

        // track all totals
        rowTotal += currentValue
        overallTotal += currentValue
        dailyTotals[i] += currentValue
      }
      rowData += `,${this._formatDuration(rowTotal)}`

      return rowData
    }).join('\n')

    const totalRow = `TOTAL,${dailyTotals.map((total) => this._formatDuration(total)).join(',')},${this._formatDuration(overallTotal)}`

    return `${headerRow}\n${contentRows}\n${totalRow}`
  }

  async generateWeeklyReport (): Promise<void> {
    const dateOptions = [this._formatDate(new Date())]
    const reportDate = await InputUtils.getUserValueWithSuggestions(dateOptions, 'Date within week of report (yyyy-dd-mm)', true)

    if (reportDate == null) {
      return
    }

    const dtSelected = new Date(reportDate)

    if (isNaN(dtSelected.getDate())) {
      return
    }

    const weeklyData = this._collateWeeklyData(new Date(dtSelected))

    const csv = this._generateWeeklyDataCSV(weeklyData, new Date(dtSelected))

    const csvFile = this._getReportFileByDate(new Date(dtSelected))

    fs.writeFileSync(csvFile, csv, fileFormat)

    const message = new vscode.MarkdownString('CSV File generated successfully')

    const csvUri = vscode.Uri.file(csvFile)

    const selection = await vscode.window.showInformationMessage(message.value, 'Open File')

    if (selection === 'Open File') {
      void vscode.env.openExternal(csvUri)
    }
  }
}

export default TaskTimer
