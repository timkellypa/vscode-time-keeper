// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import TaskTimer from './task-timer/task-timer'
import { SidebarMainProvider } from './providers/sidebar-main-provider'
import { SidebarSummaryProvider } from './providers/sidebar-summary-provider'
import SidebarState from './state/sidebar-state'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate (context: vscode.ExtensionContext): void {
  console.log('Congratulations, your extension "vscode-time-keeper" is now active!')

  const rootFilePath = context.globalStorageUri.fsPath

  const sidebarState = new SidebarState(rootFilePath)

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('vscode-time-keeper.startTask', async () => {
    const timer = new TaskTimer(rootFilePath)
    await timer.startTask(sidebarState.calendarDate ?? new Date())
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('vscode-time-keeper.stopTask', async () => {
    const timer = new TaskTimer(rootFilePath)
    await timer.stopTask(true, sidebarState.calendarDate ?? new Date())
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('vscode-time-keeper.generateWeeklyReport', async () => {
    const timer = new TaskTimer(rootFilePath)
    if (sidebarState.calendarDate == null) {
      await timer.generateWeeklyReport()
      return
    }
    await timer.generateWeeklyReport(sidebarState.calendarDate)
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('vscode-time-keeper.editTimeLog', async () => {
    const timer = new TaskTimer(rootFilePath)
    if (sidebarState.calendarDate == null) {
      await timer.editTimeLog()
      return
    }
    await timer.editTimeLog(sidebarState.calendarDate)
  })

  const settings = vscode.workspace.getConfiguration('TimeKeeper')
  const projectTasks = settings.get('ProjectTasks')
  if (projectTasks == null || Object.entries(projectTasks).length === 0) {
    void settings.update('ProjectTasks', {
      '01. Sample Project': 'Development, Tests, Unit Tests, Meetings',
      '02. HR': 'Interviews, Timesheets',
      '03. QA': 'Training'
    }, vscode.ConfigurationTarget.Global)
  }

  // Register the Sidebar Panel
  const sidebarProvider = new SidebarMainProvider(context.extensionUri, sidebarState)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'time-keeper-sidebar-main',
      sidebarProvider
    )
  )

  // Register the Summary Panel
  const summaryProvider = new SidebarSummaryProvider(context.extensionUri, sidebarState)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'time-keeper-summary',
      summaryProvider
    )
  )
}

// This method is called when your extension is deactivated
export function deactivate (): void { }
