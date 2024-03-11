import * as vscode from 'vscode'

const defaultInterval = 15
const defaultProjectTaskList = {}
const defaultAddNotes = true

const day1Offset = 1
const fileFormat = 'utf-8'

export const settings = {
  /**
   * Minutes per interval of time that is allowed in our time logs (default 15 minutes).
   */
  get interval (): number {
    return vscode.workspace.getConfiguration('TimeKeeper').get('TimeInterval') ?? defaultInterval
  },

  /**
   * Key value pairs of projects and a comma separated list of tasks.
   */
  get projectTaskList (): Record<string, string> {
    return vscode.workspace.getConfiguration('TimeKeeper').get('ProjectTasks') ?? defaultProjectTaskList
  },

  /**
   * Whether or not we can add notes to our time logs.  Notes are not used when producing reports.
   */
  get canAddNotes (): boolean {
    return vscode.workspace.getConfiguration('TimeKeeper').get('AddNotes') ?? defaultAddNotes
  },

  /**
   * Offset of the first day of the week from Sunday.  If 1 is provided, the first day for a week is considered to be Monday.
   * 0 would be Sunday.
   *
   * For now, it is not configurable and is always Monday.
   */
  get day1Offset (): number {
    return day1Offset
  },

  /**
   * The file format to use.  UTF-8
   */
  get fileFormat (): BufferEncoding {
    return fileFormat
  }
}
