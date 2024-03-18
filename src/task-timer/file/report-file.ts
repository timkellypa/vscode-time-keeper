import { formatDate, getDay1, getDay7 } from '../utils/date-utils'
import fs from 'fs'
import ReportInfo from '../classes/report-info'
import BaseFile from './base-file'

class ReportFile extends BaseFile {
  date: Date
  constructor (rootFilePath: string, date: Date) {
    super(rootFilePath)
    this.date = date
  }

  getPath (): string {
    const day1Dt = getDay1(this.date)
    const day7Dt = getDay7(this.date)

    const dtString = `${formatDate(day1Dt)} - ${formatDate(day7Dt)}`
    const dtFile = `${ReportFile.getDirectory(this.rootFilePath)}/${dtString}.csv`

    return dtFile
  }

  writeInfo (): void {
    const info = new ReportInfo(this.rootFilePath, this.date)

    this.write(info.toCSV())
  }

  static getDirectory (rootFilePath: string): string {
    const rootDirectory = `${rootFilePath}/timesheets/reports`

    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory, { recursive: true })
    }

    return rootDirectory
  }
}

export default ReportFile
