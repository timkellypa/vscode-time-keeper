import { formatDate } from '../utils/date-utils'
import fs from 'fs'
import BaseFile from './base-file'
import { settings } from '../settings'

class TimeLogFile extends BaseFile {
  date: Date

  constructor (rootFilePath: string, date: Date = new Date()) {
    super(rootFilePath)
    this.date = date
  }

  getPath (): string {
    const dtString = formatDate(this.date)
    const dtFile = `${TimeLogFile.getDirectory(this.rootFilePath)}/${dtString}.txt`

    return dtFile
  }

  taskIsOpen (): boolean {
    const fileContents = this.getContents() ?? ''
    return fileContents.trim().endsWith('-')
  }

  getNotesForTask (projectName: string, taskName: string): string[] {
    const notesSet: Set<string> = new Set<string>()
    const contents = this.getContents()
    if (contents == null) {
      return []
    }

    const lines = contents.split('\n')

    lines.forEach((line) => {
      const lineParts = line.split('\t')

      if (lineParts.length < 3) {
        return
      }

      const lineProject = lineParts[0]
      const lineTask = lineParts[1].replace(/\s*\(.*\)/, '')

      if (lineProject === projectName && lineTask === taskName) {
        const noteMatch = line.match(/\((.*)\)/)
        if (noteMatch != null && noteMatch.length > 1) {
          notesSet.add(noteMatch[1])
        }
      }
    })

    return Array.from(notesSet)
  }

  static fromDateString (rootFilePath: string, dateString: string): TimeLogFile | null {
    const dateParts = dateString.split('-')

    if (dateParts.length < 3) {
      return null
    }

    const date = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10))

    return new TimeLogFile(rootFilePath, date)
  }

  static fromFilePath (rootFilePath: string, filePathOrName: string): TimeLogFile | null {
    const filePathParts = filePathOrName.split('/')
    const fileOnly = filePathParts[filePathParts.length - 1]
    const dateString = fileOnly.split('.')[0]

    return TimeLogFile.fromDateString(rootFilePath, dateString)
  }

  /**
   * Get the path containing the time logs
   * @param rootFilePath root file path
   * @returns the path containing the time logs
   */
  static getDirectory (rootFilePath: string): string {
    const rootDirectory = `${rootFilePath}/timesheets`

    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory, { recursive: true })
    }

    return rootDirectory
  }

  static list (rootFilePath: string): TimeLogFile[] {
    const timeLogFiles: TimeLogFile[] = []

    const folder = TimeLogFile.getDirectory(rootFilePath)
    const files = fs.readdirSync(folder, { recursive: false, encoding: settings.fileFormat })

    files.forEach((file) => {
      const fullPath = `${folder}/${file}`
      if (fs.lstatSync(fullPath).isDirectory()) {
        return
      }

      // check to make sure file is formatted like one of our dates
      const timeLogFile = TimeLogFile.fromFilePath(rootFilePath, fullPath)
      if (timeLogFile == null || !timeLogFile.exists()) {
        return
      }

      timeLogFiles.push(timeLogFile)
    })
    return timeLogFiles
  }
}

export default TimeLogFile
