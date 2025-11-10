import * as vscode from 'vscode'
import InputUtils from './ui/input-utils'
import { dateFromIsoString, formatDate, getClosestIntervalToCurrentTime, getTimeOptions, isValidDate } from './utils/date-utils'
import { settings } from './settings'
import TimeLogFile from './file/timelog-file'
import ReportFile from './file/report-file'
import ReportInfo from './classes/report-info'
import type { WeeklyData } from './classes/report-info'

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

    const reportInfo = new ReportInfo(this.rootFilePath, date)

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

    // Only show current time first if we are editing today's date.
    const currentTimeFirst = formatDate(date) === formatDate(new Date())
    const startTimeOptions = getTimeOptions('00:00', { currentTimeFirst, includeEmpty: false })
    const startTime = await vscode.window.showQuickPick(startTimeOptions, { placeHolder: 'Start Time', title: lastLine, ignoreFocusOut: true })

    if (startTime == null) {
      return
    }

    const endTimeOptions = getTimeOptions(startTime, { currentTimeFirst: false, includeEmpty: true, includeStartTime: false })
    const endTime = await vscode.window.showQuickPick(endTimeOptions, { placeHolder: 'End Time <blank if ongoing>', ignoreFocusOut: true })

    if (endTime == null) {
      return
    }

    let fullTask = taskName
    if (settings.canAddNotes) {
      // Get existing notes for this project and task from this week.
      const existingNotes = reportInfo.getNotesForTask(project, taskName)

      // Get unique notes only, but only keep the latest position of each duplicate, and reverse the set.
      const uniqueNotes = Array.from(new Set(existingNotes.reverse()))
      const suggestions = ['', ...uniqueNotes]

      // Allow user to escape or unfocus here and still enter time.
      // But only add notes if user actually enters them.
      const additionalNotes = await InputUtils.getUserValueWithSuggestions(suggestions, 'Notes', true)

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
    const currentTime = getClosestIntervalToCurrentTime()
    const reportInfo = new ReportInfo(this.rootFilePath, date)
    const weeklyData = reportInfo.getWeeklyData(date)
    const openStartTime = weeklyData.openDays[weeklyData.currentDayIndex]

    const file = new TimeLogFile(this.rootFilePath, date)
    const fileContents = file.getContents() ?? ''

    if (openStartTime === '') {
      // No open task for today.
      return
    }

    const timeOptions = getTimeOptions(openStartTime, { currentTimeFirst: false, includeEmpty: false, includeStartTime: false })

    // If this is an open day, it has to have contents.
    const lines = fileContents.split('\n')
    const lastLine = lines[lines.length - 1]

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

  /**
   * Get entire contents of weekly data for a given date string.
   * These can be parsed by the individual SideBar views as needed
   * for reporting and summaries.
   * @param dateString ISO date string in the format YYYY-MM-DD
   * @returns {WeeklyData} data structure with all the weekly data for the week containing the date.
   */
  async getWeeklyData (dateString: string): Promise<WeeklyData> {
    const dt = dateFromIsoString(dateString)
    const reportInfo = new ReportInfo(this.rootFilePath, dt)
    const value = reportInfo.getWeeklyData(dt)
    return value
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
      const timelogFile = new TimeLogFile(this.rootFilePath, dateFromIsoString(dateString))
      if (!timelogFile.exists()) {
        timelogFile.write('')
      }
      void vscode.window.showTextDocument(timelogFile.getUri())
    }
  }
}

export default TaskTimer
