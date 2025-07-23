import * as vscode from 'vscode'
import InputUtils from './ui/input-utils'
import { dateFromIsoString, formatDate, getClosestIntervalToCurrentTime, getTimeOptions, isValidDate } from './utils/date-utils'
import { settings } from './settings'
import TimeLogFile from './file/timelog-file'
import ReportFile from './file/report-file'

const statusMessageTimeout = 3000

class TaskTimer {
  rootFilePath: string

  constructor (rootFilePath: string) {
    this.rootFilePath = rootFilePath
  }

  async startTask (date: Date = new Date()): Promise<void> {
    // stop any currently running tasks with the current date and time (no user input)
    await this.stopTask(false)

    const file = new TimeLogFile(this.rootFilePath, date)
    const fileContents = file.getContents()
    let lastLine = ''

    if (fileContents !== null) {
      const lines = fileContents.split('\n')
      lastLine = lines[lines.length - 1]
    }

    const projectOptions = Object.keys(settings.projectTaskList).sort()
    const project = await vscode.window.showQuickPick(projectOptions, { placeHolder: 'Project Name', title: lastLine, ignoreFocusOut: true })

    if (project == null) {
      return
    }

    const taskOptions = (settings.projectTaskList[project] ?? '').split(',').map((taskName) => taskName.trim())
    const taskName = await vscode.window.showQuickPick(taskOptions, { placeHolder: 'Task Name', title: lastLine, ignoreFocusOut: true })

    if (taskName == null) {
      return
    }

    const timeOptions = getTimeOptions('00:00', { currentTimeFirst: true, includeEmpty: false })
    const startTime = await vscode.window.showQuickPick(timeOptions, { placeHolder: 'Start Time', title: lastLine, ignoreFocusOut: true })

    if (startTime == null) {
      return
    }

    const endTime = await vscode.window.showQuickPick(getTimeOptions(startTime, { currentTimeFirst: true, includeEmpty: true }), { placeHolder: 'End Time <blank if ongoing>', ignoreFocusOut: true })

    if (endTime == null) {
      return
    }

    let fullTask = taskName
    if (settings.canAddNotes) {
      // Allow user to escape or unfocus here and still enter time.
      // But only add notes if user actually enters them.
      const additionalNotes = await vscode.window.showInputBox({ placeHolder: 'Notes', ignoreFocusOut: true })

      if (additionalNotes != null && additionalNotes !== '') {
        fullTask = `${fullTask} (${additionalNotes})`
      }
    }

    let fileBefore = `${file.getContents()}\n`
    if (fileBefore === '\n' || !file.exists()) {
      fileBefore = ''
    }
    const currentLine = `${project}\t${fullTask}\t${startTime} - ${endTime}`
    const newContents = `${fileBefore}${currentLine}`
    file.write(newContents)
  }

  async stopTask (checkUserInput: boolean = true, date = new Date()): Promise<void> {
    // check to see if a task is open.
    let file = new TimeLogFile(this.rootFilePath, date)
    let isYesterday = false
    if (!file.exists()) {
      const yesterday = new Date(date)
      yesterday.setDate(yesterday.getDate() - 1)
      file = new TimeLogFile(this.rootFilePath, yesterday)
      isYesterday = true
    }

    let fileContents = file.getContents()

    if (fileContents == null) {
      return
    }

    if (!file.taskIsOpen()) {
      return
    }

    if (isYesterday) {
      // if yesterday is open, leave with 24:00
      const newFileContents = `${fileContents}24:00`
      file.write(newFileContents)

      // create a row for today.
      const yesterdayRows = newFileContents.split('\n')
      const lastRowForYesterday = yesterdayRows[yesterdayRows.length - 1]
      const lastRowParts = lastRowForYesterday.split('\t')
      lastRowParts.splice(lastRowParts.length - 1, 1)
      const lastRowWithoutTimes = lastRowParts.join('\t')

      const todayOpenTaskRow = `${lastRowWithoutTimes}\t00:00 - `

      file = new TimeLogFile(this.rootFilePath)
      fileContents = todayOpenTaskRow
      file.write(fileContents)
    }

    const currentTime = getClosestIntervalToCurrentTime()

    const lines = fileContents.split('\n')
    const lastLine = lines[lines.length - 1]
    const lineParts = lastLine.split('\t')
    const startTime = lineParts[lineParts.length - 1].replace(' -', '')

    const timeOptions = getTimeOptions(startTime, { currentTimeFirst: true, includeEmpty: false })

    const endTime = !checkUserInput
      ? currentTime
      : (await vscode.window.showQuickPick(timeOptions, { placeHolder: 'End Time', title: lastLine }))

    if (endTime == null) {
      return
    }

    const newContents = `${fileContents.trim()} ${endTime}`
    file.write(newContents)

    const newContentsLines = newContents.split('\n')
    const stoppedTaskInfo = newContentsLines[newContentsLines.length - 1]
    vscode.window.setStatusBarMessage(`Task Stopped: ${stoppedTaskInfo}`, statusMessageTimeout)
  }

  async generateWeeklyReport (date?: Date): Promise<void> {
    let reportDate: string
    if (date != null) {
      reportDate = formatDate(date)
    } else {
      const dateOptions = [formatDate(new Date())]
      reportDate = await InputUtils.getUserValueWithSuggestions(dateOptions, 'Date within week of report (yyyy-dd-mm)', true)
    }

    if (reportDate == null) {
      return
    }

    const dtSelected = dateFromIsoString(reportDate)

    if (!isValidDate(dtSelected)) {
      return
    }

    const file = new ReportFile(this.rootFilePath, dtSelected)
    file.writeInfo()

    void vscode.env.openExternal(file.getUri())
  }

  async getDateContents (dateString: string): Promise<string | null> {
    const timeLogFile = TimeLogFile.fromDateString(this.rootFilePath, dateString)
    if (timeLogFile == null) {
      return null
    }
    const contents = timeLogFile.getContents()
    if (contents == null) {
      return null
    }
    return contents
  }

  async editTimeLog (date?: Date): Promise<void> {
    const files = TimeLogFile.list(this.rootFilePath)
    const sortedDateStrings: string[] = []

    files.forEach((file) => {
      sortedDateStrings.push(formatDate(file.date))
    })

    // sort filename strings in reverse order.  This should show today first, and then count down
    sortedDateStrings.sort((a, b) => b.localeCompare(a))

    let dateString
    if (date != null) {
      dateString = formatDate(date)
    } else {
      dateString = await vscode.window.showQuickPick(sortedDateStrings, { ignoreFocusOut: true, placeHolder: 'Date of Time Log' })
    }

    if (dateString != null && dateString !== '') {
      const timelogFile = TimeLogFile.fromDateString(this.rootFilePath, dateString)
      if (timelogFile == null) {
        void vscode.window.showErrorMessage(`File could not be opened! File does not exist or selection is not a proper date string: ${dateString}`)
        return
      }
      void vscode.window.showTextDocument(timelogFile.getUri())
    }
  }
}

export default TaskTimer
