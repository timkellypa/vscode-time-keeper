// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import TaskTimer from './task-timer/task-timer'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate (context: vscode.ExtensionContext): void {
  console.log('Congratulations, your extension "vscode-time-keeper" is now active!')

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('vscode-time-keeper.startTask', () => {
    const timer = new TaskTimer(context)
    void timer.startTask()
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('vscode-time-keeper.stopTask', () => {
    const timer = new TaskTimer(context)
    void timer.stopTask()
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('vscode-time-keeper.generateWeeklyReport', () => {
    const timer = new TaskTimer(context)
    void timer.generateWeeklyReport()
  })

  context.subscriptions.push(disposable)

  disposable = vscode.commands.registerCommand('vscode-time-keeper.editTimeLog', () => {
    const timer = new TaskTimer(context)
    void timer.editTimeLog()
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
}

// This method is called when your extension is deactivated
export function deactivate (): void { }
