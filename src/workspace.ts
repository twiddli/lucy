import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";

function setupEvents(context: vscode.ExtensionContext) {}
function registerCommands(context: vscode.ExtensionContext) {}

function getWorkspaceFiles() {
  const wfiles: string[] = [];
  if (vscode.workspace.workspaceFolders) {
    // check rootdir and .vscode folder
    // Note that the first entry corresponds to the value of rootPath.
    for (const p of [
      vscode.workspace.workspaceFolders[0].uri.path,
      join(vscode.workspace.workspaceFolders[0].uri.path, ".vscode"),
    ]) {
      if (existsSync(p)) {
        readdirSync(p).forEach((v) => {
          if (v.endsWith(".code-workspace")) {
            wfiles.push(v);
          }
        });
      }
    }
  }
  return wfiles;
}

function reopenInWorkspace() {
  // if not in workspace already
  if (!vscode.workspace.workspaceFile) {
    const wfiles = getWorkspaceFiles();
    // if only one file, open
    if (wfiles.length === 1) {
      vscode.commands.executeCommand("vscode.openFolder", wfiles[0], {
        noRecentEntry: true,
        forceNewWindow: false,
      });
    }
  }
}

export function registerWorkspace(context: vscode.ExtensionContext) {
  reopenInWorkspace();
  registerCommands(context);
  setupEvents(context);
}
