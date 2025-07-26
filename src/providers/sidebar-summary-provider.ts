/* eslint-disable @typescript-eslint/no-unsafe-argument */
// turn off strict mode for this file
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import * as vscode from 'vscode'
import type SidebarState from '../state/sidebar-state'

export class SidebarSummaryProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView

  constructor (private readonly _extensionUri: vscode.Uri, private readonly _state: SidebarState) {
    this._state.onDailyContentsChange((contents) => {
      this._view?.webview.postMessage({
        command: 'updateDailyContents',
        contents: contents ?? ''
      })
    })
  }

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
  }

  public revive (panel: vscode.WebviewView) {
    this._view = panel
  }

  private _getHtmlForWebview (webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'compiled/sidebar-summary.js')
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
            <div id="time-keeper-sidebar-summary"></div>
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
