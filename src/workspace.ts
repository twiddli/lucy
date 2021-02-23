import { existsSync, readdirSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import { say, showInformationMessage } from "./utils";

function setupEvents(context: vscode.ExtensionContext) {}
function registerCommands(context: vscode.ExtensionContext) {}

function getWorkspaceFiles() {
  const wfiles: string[] = [];
  if (vscode.workspace.workspaceFolders) {
    // check rootdir and .vscode folder
    // Note that the first entry corresponds to the value of rootPath.
    for (const p of [
      vscode.workspace.workspaceFolders[0].uri.fsPath,
      join(vscode.workspace.workspaceFolders[0].uri.fsPath, ".vscode"),
    ]) {
      if (existsSync(p)) {
        readdirSync(p).forEach((v) => {
          if (v.endsWith(".code-workspace")) {
            wfiles.push(join(p, v));
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
      console.log(`found workspace file ${wfiles[0]}`);

      const tout = 3500;
      const tID = setTimeout(
        () =>
          vscode.commands.executeCommand(
            "vscode.openFolder",
            vscode.Uri.file(wfiles[0]),
            {
              noRecentEntry: true,
              forceNewWindow: false,
            }
          ),
        tout
      );

      showInformationMessage(
        say(
          `Master! I found a workspace and I will automatically open it in 3 seconds. ― ${wfiles[0]}`
        ),
        "Cancel"
      ).then((v) => {
        if (v === "Cancel") {
          clearTimeout(tID);
        }
        return v;
      });

      vscode.commands
        .executeCommand("vscode.openFolder", wfiles[0], {
          noRecentEntry: true,
          forceNewWindow: false,
        })
        .then((r) => {
          console.log("Automatically opening workspace");
        });
    }
  }
}

export function registerWorkspace(context: vscode.ExtensionContext) {
  reopenInWorkspace();
  registerCommands(context);
  setupEvents(context);
}
