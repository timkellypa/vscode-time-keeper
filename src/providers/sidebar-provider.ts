/* eslint-disable @typescript-eslint/no-unsafe-argument */
// turn off strict mode for this file
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import * as vscode from 'vscode'
import TaskTimer from '../task-timer/task-timer'
import { dateFromIsoString } from '../task-timer/utils/date-utils'

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView
  _calendarDate: string | null = null

  get calendarDate (): Date {
    return this._calendarDate != null ? dateFromIsoString(this._calendarDate) : new Date()
  }

  constructor (private readonly _extensionUri: vscode.Uri, private readonly _rootFilePath: string) { }

  public resolveWebviewView (webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'out/compiled'),
        vscode.Uri.joinPath(this._extensionUri, 'media')
      ]
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    // Listen for messages from the Sidebar component and execute action
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'setCalendarDate': {
          this._calendarDate = data.date
          await this.postDateContents()
          break
        }
        case 'addTimeEntry': {
          const timer = new TaskTimer(this._rootFilePath)
          await timer.startTask(this.calendarDate)
          break
        }
        case 'generateWeeklyReport': {
          const timer = new TaskTimer(this._rootFilePath)
          await timer.generateWeeklyReport(this.calendarDate)
          break
        }
        case 'editTimeLog': {
          const timer = new TaskTimer(this._rootFilePath)
          await timer.editTimeLog(this.calendarDate)
          break
        }
        case 'stopTask': {
          const timer = new TaskTimer(this._rootFilePath)
          await timer.stopTask(true, this.calendarDate)
          break
        }
      }
    })

    // Watcher will tell the sidebar when files change, so we can update the contents.
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this._rootFilePath, 'timesheets/*.txt'))
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
    if (this._view == null || this._calendarDate == null) {
      return
    }

    const timer = new TaskTimer(this._rootFilePath)
    const contents = await timer.getDateContents(this._calendarDate)
    this._view?.webview.postMessage({ command: 'pageContents', contents })
  }

  public revive (panel: vscode.WebviewView) {
    this._view = panel
  }

  private _getHtmlForWebview (webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'compiled/sidebar.js')
    )

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce()

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <!--
          Use a content security policy to only allow loading images from https or from our extension directory,
          and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource
            }; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script nonce="${nonce}">
                    const tsvscode = acquireVsCodeApi();
                </script>

                </head>
            <body>
            <div id="time-keeper-sidebar"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`
  }
}

function getNonce () {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
