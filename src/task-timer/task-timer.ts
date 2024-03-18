import * as vscode from 'vscode'
import InputUtils from './ui/input-utils'
import { formatDate, getClosestIntervalToCurrentTime, getTimeOptions, isValidDate } from './utils/date-utils'
import { settings } from './settings'
import TimeLogFile from './file/timelog-file'
import ReportFile from './file/report-file'

class TaskTimer {
  rootFilePath: string

  constructor (rootFilePath: string) {
    this.rootFilePath = rootFilePath
  }

  async startTask (): Promise<void> {
    // stop any currently running tasks with the current date and time (no user input)
    await this.stopTask(false)

    const projectOptions = Object.keys(settings.projectTaskList).sort()
    const project = await InputUtils.getUserValueWithSuggestions(projectOptions, 'Project Name', true)

    if (project == null) {
      return
    }

    const taskOptions = (settings.projectTaskList[project] ?? '').split(',').map((taskName) => taskName.trim())
    const taskName = await InputUtils.getUserValueWithSuggestions(taskOptions, 'Task Name', true)

    if (taskName == null) {
      return
    }

    const timeOptions = getTimeOptions()
    const startTime = await vscode.window.showQuickPick(timeOptions, { title: 'Start Time', ignoreFocusOut: true })

    if (startTime == null) {
      return
    }

    let fullTask = taskName
    if (settings.canAddNotes) {
      // Allow user to escape or unfocus here and still enter time.
      // But only add notes if user actually enters them.
      const additionalNotes = await vscode.window.showInputBox({ placeHolder: 'Notes' })

      if (additionalNotes != null && additionalNotes !== '') {
        fullTask = `${fullTask} (${additionalNotes})`
      }
    }

    const file = new TimeLogFile(this.rootFilePath)

    const fileBefore = file.exists() ? `${file.getContents()}\n` : ''
    const newContents = `${fileBefore}${project}\t${fullTask}\t${startTime} - `
    file.write(newContents)

    void vscode.window.showInformationMessage('Task Started', { detail: newContents }, 'OK', 'Edit Manually')
      .then((selection) => {
        if (selection === 'Edit Manually') {
          void vscode.window.showTextDocument(file.getUri())
        }
      })
  }

  async stopTask (checkUserInput: boolean = true): Promise<void> {
    // check to see if a task is open.
    let file = new TimeLogFile(this.rootFilePath)
    let isYesterday = false
    if (!file.exists()) {
      const yesterday = new Date()
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

    const timeOptions = getTimeOptions(startTime)

    const endTime = !checkUserInput
      ? currentTime
      : (await vscode.window.showQuickPick(timeOptions, { placeHolder: 'End Time', title: lastLine }))

    if (endTime == null) {
      return
    }

    const newContents = `${fileContents}${endTime}`
    file.write(newContents)

    const newContentsLines = newContents.split('\n')
    const stoppedTaskInfo = newContentsLines[newContentsLines.length - 1]
    void vscode.window.showInformationMessage('Task Stopped', { detail: stoppedTaskInfo }, 'OK', 'Edit Manually')
      .then((selection) => {
        if (selection === 'Edit Manually') {
          void vscode.window.showTextDocument(file.getUri())
        }
      })
  }

  async generateWeeklyReport (): Promise<void> {
    const dateOptions = [formatDate(new Date())]
    const reportDate = await InputUtils.getUserValueWithSuggestions(dateOptions, 'Date within week of report (yyyy-dd-mm)', true)

    if (reportDate == null) {
      return
    }

    const dtSelected = new Date(reportDate)

    if (!isValidDate(dtSelected)) {
      return
    }

    const file = new ReportFile(this.rootFilePath, dtSelected)
    file.writeInfo()

    const message = new vscode.MarkdownString('CSV File generated successfully')

    const selection = await vscode.window.showInformationMessage(message.value, 'Open File')

    if (selection === 'Open File') {
      void vscode.env.openExternal(file.getUri())
    }
  }

  async editTimeLog (): Promise<void> {
    const files = TimeLogFile.list(this.rootFilePath)
    const sortedDateStrings: string[] = []

    files.forEach((file) => {
      sortedDateStrings.push(formatDate(file.date))
    })

    // sort filename strings in reverse order.  This should show today first, and then count down
    sortedDateStrings.sort((a, b) => b.localeCompare(a))

    const dateString = await vscode.window.showQuickPick(sortedDateStrings, { ignoreFocusOut: true, placeHolder: 'Date of Time Log' })

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
