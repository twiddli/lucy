import * as vscode from "vscode";
import {
  capitalize,
  getMementoValue,
  uncapitalize,
  generateID,
  getPath,
  updateArrayItem,
  say,
  formatTime,
} from "./utils";
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
    super(`${reminder.text}`, collapsibleState);
    const time = formatTime(reminder.added);

    this.id = reminder.id;
    this.description = `${time} | Cleared: ${reminder.cleared}`;
    this.tooltip = `${reminder.text} | ${this.description}`;
    this.contextValue = "reminderItem";
    if (reminder.cleared) {
      this.contextValue += " cleared";
    }
    if (reminder.cleared) {
      this.iconPath = {
        dark: getPath("media/pass-filled.svg"),
        light: getPath("media/pass-filled_l.svg"),
      };
    } else {
      this.iconPath = {
        dark: getPath("media/circle-large-outline.svg"),
        light: getPath("media/circle-large-outline_l.svg"),
      };
    }
  }
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

  event.reminders = reminders;
  event.lastReminder = reminder;

  vscode.window.showInformationMessage(
    `Master, on your next session I will remind you to ${uncapitalize(text)!}`
  );
}

// Sort by active, not cleared, cleared date and then date
function sortReminders(reminders: Reminder[]) {
  return reminders.sort((a, b) => {
    return (
      Number(b.active) - Number(a.active) ||
      Number(a.cleared) - Number(b.cleared) ||
      (b.clearDate?.getTime() ?? 0) - (a.clearDate?.getTime() ?? 0) ||
      b.added.getTime() - a.added.getTime()
    );
  });
}

function clearReminder(reminder: Reminder) {
  event.reminders = sortReminders(
    updateArrayItem(
      {
        id: reminder.id as string,
        cleared: true,
        clearDate: new Date(),
        active: false,
      },
      event.reminders
    )
  );

  vscode.window.showInformationMessage(
    say("{{ compliment_c }}! You have just cleared a reminder")
  );
}

function unclearReminder(reminder: Reminder) {
  event.reminders = sortReminders(
    updateArrayItem(
      {
        id: reminder.id as string,
        cleared: false,
        clearDate: null,
      },
      event.reminders
    )
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

    context.workspaceState.update(WorkspaceStateKey.reminders, value);
  });
}

function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.remind", () => {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          placeHolder: `Lucy please remind me to...`,
          prompt: `Ask lucy to remind you something for your next coding session 🔔`,
        })
        .then(onRemindCommand);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.reminderClear",
      (reminder: ReminderTreeItem) => {
        if (reminder) {
          if (!reminder.reminder.cleared) {
            clearReminder(reminder.reminder);
          } else {
            unclearReminder(reminder.reminder);
          }
        }
      }
    )
  );
}

function loadState(context: vscode.ExtensionContext) {
  event.reminders = sortReminders(
    getMementoValue(context.workspaceState, WorkspaceStateKey.reminders) ?? []
  );
}

export function registerReminder(context: vscode.ExtensionContext) {
  loadState(context);
  registerCommands(context);

  reminderTreeProvider = new ReminderTreeProvider();

  vscode.window.registerTreeDataProvider("lucy.reminder", reminderTreeProvider);

  setupEvents(context);
}
