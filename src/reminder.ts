import * as vscode from "vscode";
import { format } from "timeago.js";
import { capitalize, getMementoValue, uncapitalize, generateID } from "./utils";
import { event, subscribe } from "./event";
import { Reminder, WorkspaceStateKey } from "./types";

let reminderTreeProvider: ReminderTreeProvider;

export class ReminderTreeProvider
  implements vscode.TreeDataProvider<ReminderTreeItem> {
  getTreeItem(element: ReminderTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: ReminderTreeItem
  ): Thenable<ReminderTreeItem[]> | undefined {
    if (element) {
      return undefined;
    } else {
      return Promise.resolve(this.getReminders());
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    ReminderTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ReminderTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ReminderTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private getReminders(): ReminderTreeItem[] {
    return event.reminders.map((r) => {
      return new ReminderTreeItem(r, vscode.TreeItemCollapsibleState.None);
    });
  }
}

class ReminderTreeItem extends vscode.TreeItem {
  constructor(
    public readonly reminder: Reminder,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${reminder.cleared ? "⦿" : "⊖"} ${reminder.text}`, collapsibleState);
    const time = format(reminder.added, "en_US");

    this.id = reminder.id;
    this.description = `${time} | Cleared: ${reminder.cleared}`;
    this.tooltip = `${reminder.text} | ${this.description}`;
    this.contextValue = "reminderItem";
  }

  // iconPath = {
  //   light: path.join(
  //     __filename,
  //     "..",
  //     "..",
  //     "resources",
  //     "light",
  //     "dependency.svg"
  //   ),
  //   dark: path.join(
  //     __filename,
  //     "..",
  //     "..",
  //     "resources",
  //     "dark",
  //     "dependency.svg"
  //   ),
  // };
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

  const reminders = [reminder, ...event.reminders];

  if (event.context) {
    event.context.workspaceState.update(WorkspaceStateKey.reminders, reminders);
  }

  event.reminders = reminders;
  event.lastReminder = reminder;

  vscode.window.showInformationMessage(
    `Master, on your next session I will remind you to ${uncapitalize(text)!}`
  );
}

function onRemindCommand(reminder: string | undefined) {
  if (!reminder) {
    return;
  }

  createReminder(reminder);
}

function setupEvents(context: vscode.ExtensionContext) {
  subscribe("sessionActive", (value) => {
    if (value) {
      vscode.window.showInformationMessage(
        `Master, a new coding session has begun!`
      );
    }
  });

  subscribe("reminders", (value) => {
    if (value) {
      reminderTreeProvider.refresh();
    }
  });
}

function loadState(context: vscode.ExtensionContext) {
  event.reminders =
    getMementoValue(context.workspaceState, WorkspaceStateKey.reminders) ?? [];
}

export function registerReminder(context: vscode.ExtensionContext) {
  loadState(context);

  reminderTreeProvider = new ReminderTreeProvider();

  vscode.window.registerTreeDataProvider("lucy.reminder", reminderTreeProvider);

  let reminder = vscode.commands.registerCommand("lucy.remind", () => {
    vscode.window
      .showInputBox({
        ignoreFocusOut: true,
        placeHolder: `Lucy please remind me to...`,
        prompt: `Ask lucy to remind you something for your next coding session 🔔`,
      })
      .then(onRemindCommand);
  });
  context.subscriptions.push(reminder);

  setupEvents(context);
}
