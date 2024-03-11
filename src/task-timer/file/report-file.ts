import type * as vscode from 'vscode'
import { formatDate, getDay1, getDay7 } from '../utils/date-utils'
import fs from 'fs'
import ReportInfo from '../classes/report-info'
import BaseFile from './base-file'

class ReportFile extends BaseFile {
  date: Date
  constructor (context: vscode.ExtensionContext, date: Date) {
    super(context)
    this.date = date
  }

  getPath (): string {
    const day1Dt = getDay1(this.date)
    const day7Dt = getDay7(this.date)

    const dtString = `${formatDate(day1Dt)} - ${formatDate(day7Dt)}`
    const dtFile = `${ReportFile.getDirectory(this.context)}/${dtString}.csv`

    return dtFile
  }

  writeInfo (): void {
    const info = new ReportInfo(this.context, this.date)

    this.write(info.toCSV())
  }

  static getDirectory (context: vscode.ExtensionContext): string {
    const storageDirectory = context.globalStorageUri.fsPath
    const rootDirectory = `${storageDirectory}/timesheets/reports`

    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory, { recursive: true })
    }

    return rootDirectory
  }
}

export default ReportFile
