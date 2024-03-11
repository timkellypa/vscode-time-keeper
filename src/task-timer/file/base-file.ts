import * as vscode from 'vscode'
import fs from 'fs'
import { settings } from '../settings'

class BaseFile {
  context: vscode.ExtensionContext
  constructor (context: vscode.ExtensionContext) {
    this.context = context
  }

  /**
   * Get the file path for this file
   * @abstract
   */
  getPath (): string {
    throw new Error('getFilePath must be implemented by a BaseFile implementation')
  }

  getUri (): vscode.Uri {
    return vscode.Uri.file(this.getPath())
  }

  getContents (): string | null {
    if (!this.exists()) {
      return null
    }
    return fs.readFileSync(this.getPath(), settings.fileFormat)
  }

  exists (): boolean {
    return fs.existsSync(this.getPath())
  }

  write (data: string): void {
    fs.writeFileSync(this.getPath(), data, settings.fileFormat)
  }
}

export default BaseFile
