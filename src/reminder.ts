import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { capitalize, getMementoValue, uncapitalize, generateID } from "./utils";
import { event, subscribe } from "./event";
import { Reminder, WorkspaceStateKey } from "./types";

export class ReminderTreeProvider
  implements vscode.TreeDataProvider<ReminderTreeItem> {
  constructor(private workspaceRoot: string) {}

  getTreeItem(element: ReminderTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ReminderTreeItem): Thenable<ReminderTreeItem[]> {
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
  private getDepsInPackageJson(packageJsonPath: string): ReminderTreeItem[] {
    if (this.pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      const toDep = (moduleName: string, version: string): ReminderTreeItem => {
        if (
          this.pathExists(
            path.join(this.workspaceRoot, "node_modules", moduleName)
          )
        ) {
          return new ReminderTreeItem(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.Collapsed
          );
        } else {
          return new ReminderTreeItem(
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

class ReminderTreeItem extends vscode.TreeItem {
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

function createReminder(text: string) {
  const added = new Date();

  const reminder: Reminder = {
    id: generateID(),
    text: capitalize(text),
    added,
    active: false,
    cleared: false,
    clearDate: null,
  };

  const reminders = [...event.reminders, reminder];

  if (event.context) {
    event.context.workspaceState.update(WorkspaceStateKey.reminders, reminders);
  }

  event.reminders = reminders;
  event.lastReminder = reminder;

  vscode.window.showInformationMessage(
    `Master, on your next session I will remind you to ${uncapitalize(text)!}`
  );
}

function setupEvents(context: vscode.ExtensionContext) {
  subscribe("sessionActive", (value) => {
    if (value) {
      vscode.window.showInformationMessage(
        `Master, a new coding session has begun!`
      );
    }
  });
}

function loadState(context: vscode.ExtensionContext) {
  event.reminders =
    getMementoValue(context.workspaceState, WorkspaceStateKey.reminders) ?? [];
}

export function registerReminder(context: vscode.ExtensionContext) {
  loadState(context);

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

        createReminder(reminder);
      });
  });
  context.subscriptions.push(reminder);

  setupEvents(context);
}
