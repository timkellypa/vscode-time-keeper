import * as vscode from 'vscode'
import fs from 'fs'

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

  _taskIsOpen (fileContents: string): boolean {
    return fileContents.endsWith('- ')
  }

  async startTask (): Promise<void> {
    // stop any currently running tasks with the current date and time (no user input)
    await this.stopTask(false)

    const currentTime = this._getCurrentTime()

    const project = await vscode.window.showInputBox({
      placeHolder: 'Project Name',
      prompt: ''
    })
    const taskName = await vscode.window.showInputBox({
      placeHolder: 'Task Name',
      prompt: ''
    })
    let startTime =
      (await vscode.window.showInputBox({
        placeHolder: 'Start Time',
        prompt: `Start Time, <enter> for now (${currentTime})`
      }))

    if (startTime == null || startTime === '') {
      startTime = currentTime
    }

    const file = this._getFileByDate()

    const fileBefore = fs.existsSync(file) ? `${fs.readFileSync(file, fileFormat)}\n` : ''
    const newContents = `${fileBefore}${project}\t${taskName}\t${startTime} - `
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

    const currentTime = this._getCurrentTime()
    let endTime = !checkUserInput
      ? null
      : (await vscode.window.showInputBox({
          placeHolder: 'Start Time',
          prompt: `Start Time, <enter> for now (${currentTime})`
        }))

    if (endTime == null || endTime === '') {
      endTime = currentTime
    }

    const newContents = `${fileContents}${endTime}`
    fs.writeFileSync(file, newContents, fileFormat)
  }
}

export default TaskTimer
