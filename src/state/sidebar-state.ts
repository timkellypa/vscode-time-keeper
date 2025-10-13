import type { WeeklyData } from '../task-timer/classes/report-info'
import TaskTimer from '../task-timer/task-timer'
import { formatDate } from '../task-timer/utils/date-utils'
import * as vscode from 'vscode'

export default class SidebarState {
  calendarDate: Date | null = null
  pageData: WeeklyData | null = null

  async setCalendarDate (date: Date): Promise<void> {
    this.calendarDate = date
    this._onDateChange.fire(this.calendarDate)

    await this.postDateContents()
  }

  private readonly _onDateChange = new vscode.EventEmitter<Date>()
  readonly onDateChange: vscode.Event<Date> = this._onDateChange.event

  private readonly _onWeeklyDataChange = new vscode.EventEmitter<WeeklyData>()
  readonly onWeeklyDataChange: vscode.Event<WeeklyData> = this._onWeeklyDataChange.event

  private readonly _openValueChange = new vscode.EventEmitter<boolean>()
  readonly onOpenValueChange: vscode.Event<boolean> = this._openValueChange.event

  constructor (public readonly rootFilePath: string) {
    // Watcher will tell the sidebar when files change, so we can update the contents.
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.rootFilePath, 'timesheets/*.txt'))
    watcher.onDidChange(async (uri) => {
      await this.postDateContents()
    })

    watcher.onDidCreate(async (uri) => {
      await this.postDateContents()
    })

    watcher.onDidDelete(async (uri) => {
      await this.postDateContents()
    })
  }

  private async postDateContents (): Promise<void> {
    if (this.calendarDate == null) {
      return
    }

    const timer = new TaskTimer(this.rootFilePath)
    const weeklyData = await timer.getWeeklyData(formatDate(this.calendarDate))
    this.pageData = weeklyData
    this._onWeeklyDataChange.fire(weeklyData)
  }
}
