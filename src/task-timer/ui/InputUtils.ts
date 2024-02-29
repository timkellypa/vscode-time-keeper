import * as vscode from 'vscode'

const InputUtils = {
  async getUserValueWithSuggestions (choices: string[], placeHolder: string = ''): Promise<string> {
    return await new Promise((resolve) => {
      const quickPick = vscode.window.createQuickPick()
      quickPick.items = choices.map(choice => ({ label: choice }))

      quickPick.title = placeHolder

      quickPick.onDidChangeValue(() => {
        // INJECT user values into proposed values
        if (!choices.includes(quickPick.value)) quickPick.items = [quickPick.value, ...choices].map(label => ({ label }))
      })

      quickPick.onDidAccept(() => {
        const selection = quickPick.activeItems[0]
        resolve(selection.label)
        quickPick.hide()
      })
      quickPick.show()
    })
  }
}

export default InputUtils
