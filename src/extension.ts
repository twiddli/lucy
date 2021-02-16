// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { WorkspaceStateKey, WorkspaceStateValue } from "./constants";
import { registerReminder } from "./reminder";

function updateStatus(status: vscode.StatusBarItem): void {
  const enabled = true;
  status.text = "Lucy";
  status.tooltip = "Lucy";
  //   status.color = info ? info.color : undefined;

  if (enabled) {
    status.show();
  } else {
    status.hide();
  }
}

function setupStatusbarItem(context: vscode.ExtensionContext) {
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1
  );
  context.subscriptions.push(status);
  updateStatus(status);
}

function setupEvents(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((e) => {
      context.workspaceState.update(WorkspaceStateKey.active, e.focused);
      if (e.focused) {
        const last_active = context.workspaceState.get<
          WorkspaceStateValue[WorkspaceStateKey.last_active]
        >(WorkspaceStateKey.last_active);

        if (last_active) {
          const diff = Math.floor(
            Math.abs(last_active.getTime() - Date.now()) / 1000 / 60
          );
          vscode.window.showInformationMessage(
            `Master... Last focus was ${diff} minutes ago`
          );
        }
      }

      if (e.focused) {
        context.workspaceState.update(
          WorkspaceStateKey.last_active,
          new Date()
        );
      }
    })
  );
}

function setup(context: vscode.ExtensionContext) {
  registerReminder(context);
  setupStatusbarItem(context);
  setupEvents(context);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "lucy" is now active!');

  // this method is called when your extension is activated
  // your extension is activated the very first time the command is executed
  setup(context);

  vscode.window.showInformationMessage("Master... It's good to see you");
}

// this method is called when your extension is deactivated
export function deactivate() {}
