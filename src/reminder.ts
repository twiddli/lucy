import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { uncapitalize } from "./utils";
import { WorkspaceStateKey, WorkspaceStateValue } from "./constants";

export class ReminderProvider implements vscode.TreeDataProvider<Reminder> {
  constructor(private workspaceRoot: string) {}

  getTreeItem(element: Reminder): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Reminder): Thenable<Reminder[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No reminders in empty workspace");
      return Promise.resolve([]);
    }

    if (element) {
      return Promise.resolve(
        this.getDepsInPackageJson(
          path.join(
            this.workspaceRoot,
            "node_modules",
            element.label,
            "package.json"
          )
        )
      );
    } else {
      const packageJsonPath = path.join(this.workspaceRoot, "package.json");
      if (this.pathExists(packageJsonPath)) {
        return Promise.resolve(this.getDepsInPackageJson(packageJsonPath));
      } else {
        vscode.window.showInformationMessage("Workspace has no package.json");
        return Promise.resolve([]);
      }
    }
  }

  /**
   * Given the path to package.json, read all its dependencies and devDependencies.
   */
  private getDepsInPackageJson(packageJsonPath: string): Reminder[] {
    if (this.pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      const toDep = (moduleName: string, version: string): Reminder => {
        if (
          this.pathExists(
            path.join(this.workspaceRoot, "node_modules", moduleName)
          )
        ) {
          return new Reminder(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.Collapsed
          );
        } else {
          return new Reminder(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.None
          );
        }
      };

      const deps = packageJson.dependencies
        ? Object.keys(packageJson.dependencies).map((dep) =>
            toDep(dep, packageJson.dependencies[dep])
          )
        : [];
      const devDeps = packageJson.devDependencies
        ? Object.keys(packageJson.devDependencies).map((dep) =>
            toDep(dep, packageJson.devDependencies[dep])
          )
        : [];
      return deps.concat(devDeps);
    } else {
      return [];
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }
}

class Reminder extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.version}`;
    this.description = this.version;
  }

  iconPath = {
    light: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "light",
      "dependency.svg"
    ),
    dark: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "dark",
      "dependency.svg"
    ),
  };
}

function setupEvents(context: vscode.ExtensionContext) {}

export function registerReminder(context: vscode.ExtensionContext) {
  let reminder = vscode.commands.registerCommand("lucy.remind", () => {
    vscode.window
      .showInputBox({
        ignoreFocusOut: true,
        placeHolder: `Lucy please remind me to...`,
        prompt: `Ask lucy to remind you something for your next coding session 🔔`,
      })
      .then((reminder) => {
        if (!reminder) {
          return;
        }

        vscode.window.showInformationMessage(
          `Master, on your next session I will remind you to ${uncapitalize(
            reminder
          )!}`
        );

        // reminder time
        // const timePeriod = datefns.differenceInMilliseconds(
        //   event.startDate,
        //   new Date()
        // );
        // var timer = setInterval(function () {
        //   vscode.window
        //     .showInformationMessage(`⏰  '${event.eventTitle}' now! ⏰`)
        //     .then(() => {
        //       clearTimeout(timer);
        //     });
        // }, timePeriod);
      });
  });
  context.subscriptions.push(reminder);
}
