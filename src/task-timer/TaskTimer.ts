import * as vscode from 'vscode'
import fs from 'fs'
import InputUtils from './ui/InputUtils'

const defaultInterval = 15
const defaultProjectTaskList = {}
const defaultAddNotes = true

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

  _getTimesheetRootPath (): string {
    const storageDirectory = this.context.globalStorageUri.fsPath
    const rootDirectory = `${storageDirectory}/timesheets`

    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory, { recursive: true })
    }
    return rootDirectory
  }

  _getFileByDate (date = new Date()): string {
    const dtString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const dtFile = `${this._getTimesheetRootPath()}/${dtString}.txt`

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

  _taskIsOpen (fileContents: string): boolean {
    return fileContents.endsWith('- ')
  }

  _getTimeOptions (): string[] {
    let times = []

    for (let h = 0; h < 24; ++h) {
      for (let m = 0; m < 60; m += this.interval) {
        times.push(`${padNumber(h, 2)}:${padNumber(m, 2)}`)
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
      // if yesterday is open, leave with 23:59
      const newFileContents = `${fileContents}23:59`
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
    const timeOptions = this._getTimeOptions()
    const endTime = !checkUserInput
      ? currentTime
      : (await vscode.window.showQuickPick(timeOptions, { title: 'End Time' }))

    if (endTime == null) {
      return
    }

    const newContents = `${fileContents}${endTime}`
    fs.writeFileSync(file, newContents, fileFormat)
  }
}

export default TaskTimer
