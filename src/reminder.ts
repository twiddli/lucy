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
  showInformationMessage,
} from "./utils";
import { event, subscribe } from "./event";
import { PartialExcept, Reminder, WorkspaceStateKey } from "./types";
import { start } from "repl";
import { open } from "fs";

interface ReminderState {
  lineNumber: number;
}

let reminderTreeProvider: ReminderTreeProvider;
const bgColor = new vscode.ThemeColor("lucy.reminderBackground");
const decoration = vscode.window.createTextEditorDecorationType({backgroundColor:bgColor});
const tempReminderState: {[id:string]: ReminderState} = {};

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
    this.description = `${time} ― Cleared: ${reminder.cleared}`;
    this.tooltip = `${reminder.text}\n― ${this.description}`;
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

    //open file if associated with reminder
    if (reminder.filePath) {
      const lineNumber = reminder.lineNumber ?? (tempReminderState[reminder.id]?.lineNumber ?? 0);
      //open at specified line, or at the top of file if none
      let selection = new vscode.Selection(
        new vscode.Position(lineNumber, 0),
        new vscode.Position(lineNumber, 0)
      );
      
      
      this.command = {
        command: "vscode.open",
        title: "Show reminder",
        arguments: [
          vscode.Uri.parse("file:///" + reminder.filePath),
          {
            preview: false, //open in new editor tab
            selection: selection,
          },
        ],
      };
    } else {
      this.command = {
        command: "lucy.reminderShow",
        title: "Show reminder",
        arguments: [this.id],
      };
    }
  }
}

function createReminder(text: string): Reminder {
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

  showInformationMessage(
    `Master, on your next session I will remind you to ${uncapitalize(text)!}`
  );

  return reminder;
}

function createFileReminder(text: string) {
  let editor = vscode.window.activeTextEditor;
  if (editor) {
    let reminder = createReminder(text);
    reminder.filePath = editor.document.fileName.replace(/\\/g, "/");
  }
}

function createInFileReminder(text: string) {
  let editor = vscode.window.activeTextEditor;
  //only process adding reminders in files if there are any files open
  if (editor) {
    let reminder = createReminder(text);
    reminder.filePath = editor.document.fileName.replace(/\\/g, "/");
    tempReminderState[reminder.id] = { lineNumber : editor.selection.active.line };
    highlightRemindersInFile(reminder.filePath);
  }
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

function clearReminder(reminder: PartialExcept<Reminder, "id">) {
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

  showInformationMessage(
    say("{{ compliment_c }}! You have just cleared a reminder")
  );
}

function clearAllReminders() {
  event.reminders = sortReminders(
    event.reminders.map((r) => ({
      ...r,
      ...{
        cleared: true,
        clearDate: r.cleared ? r.clearDate : new Date(),
        active: false,
      },
    }))
  );

  showInformationMessage(
    say("All reminders have been cleared, {{ compliment }}!")
  );
}

function unclearReminder(reminder: PartialExcept<Reminder, "id">) {
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

function deleteReminder(reminder: PartialExcept<Reminder, "id">) {
  const idx = event.reminders.findIndex((r) => r.id === reminder.id);
  if (idx > -1) {
    const r = [...event.reminders];
    r.splice(idx, 1);
    event.reminders = r;
  }
}

function showReminder(reminder: Reminder) {
  showInformationMessage(
    (reminder.cleared
      ? "Master, I already reminded you of: "
      : "Master, remember to: ") +
      `\n${uncapitalize(reminder.text)}` +
      ` ―― ` +
      (reminder.active ? `\nCurrently active ―` : "") +
      (reminder.cleared
        ? ` Cleared ${formatTime(reminder.clearDate as Date)} ―`
        : "") +
      ` Added ${formatTime(reminder.added)}`,
    ...[!reminder.cleared ? "Clear" : ""].filter(Boolean)
  ).then((s) => {
    if (s === "Clear") {
      clearReminder(reminder);
    }
    return s;
  });
}

function onRemindFileCommand(reminder: string | undefined) {
  if (reminder) createFileReminder(reminder);
}

function onRemindInFileCommand(reminder: string | undefined) {
  if (reminder) {
    createInFileReminder(reminder);
  }
}

function setupEvents(context: vscode.ExtensionContext) {
  subscribe("sessionActive", (value) => {
    if (value) {
      // get most recent uncleared reminders
      const recent = event.reminders.filter((r) => !r.cleared).slice(0, 3);
      showInformationMessage(
        `Master, I was told to remind you of these tasks ―― ` +
          recent.map((r) => r.text).join(" ― ")
      );
    }
  });

  subscribe("reminders", (value) => {
    if (value) {
      reminderTreeProvider.refresh();
    }

    context.workspaceState.update(WorkspaceStateKey.reminders, value);
  });  

  vscode.workspace.onDidOpenTextDocument(fileOpenHandler);
  vscode.workspace.onDidChangeTextDocument(fileChangeMonitor);
  vscode.workspace.onDidSaveTextDocument(fileSaveHandler);
}

function highlightRemindersInFile(filePath: string) {
  let ranges : vscode.Range[] = [];
  const reminders = event.reminders || [];
  reminders.forEach((reminder) => {
    //console.log('reminder: ', reminder.text, 'reminder filepath: ', reminder.filePath);
    if (!reminder.cleared
      && reminder.filePath 
      //in the minds of VSCode developers, appending nonexistent extensions to file paths on file open events is a sound idea
      //https://github.com/microsoft/vscode/issues/22561
      && (reminder.filePath === filePath || reminder.filePath + '.git' === filePath) 
      && (tempReminderState[reminder.id]?.lineNumber || reminder.lineNumber)) { 
        //if there is a temporary state, use that, otherwise, read from the reminder's permanent state
        const lineNumber = tempReminderState[reminder.id]?.lineNumber ?? reminder.lineNumber;
      ranges.push(new vscode.Range(
        new vscode.Position(lineNumber, 0),
        new vscode.Position(lineNumber + 1, 0)));
    }
  });

  if (ranges.length > 0) {
    //console.log('setting highlights in ', openedFilePath, ' at ranges: ', ranges);
    vscode.window.activeTextEditor?.setDecorations(decoration, ranges);
  }
}

//highlights all reminders in an opened document
function fileOpenHandler(e: vscode.TextDocument) {
  //let ranges : vscode.Range[] = [];

  const reminders = event.reminders || [];
  const openedFilePath = e.fileName.replace(/\\/g, "/");
  highlightRemindersInFile(openedFilePath);
  

}

function fileSaveHandler(e:vscode.TextDocument) {
  const savedFilePath = e.fileName.replace(/\\/g, "/");
  //go through all temporary state changes and if they apply to the reminder, commit them
  event.reminders = event.reminders.map((reminder) => {
    if (reminder.filePath && reminder.filePath === savedFilePath) {
      return Object.assign({}, reminder, tempReminderState[reminder.id] ?? {});
    }
    else {
      return reminder;
    }
  });
}

//calculates the change in line count of a document and updates all reminders below the line to reflect the change
function fileChangeMonitor(e:vscode.TextDocumentChangeEvent) {
  const endLine = e.contentChanges[0].range.end.line; 
  const startLine = e.contentChanges[0].range.start.line;
  const selectedLinesCount = endLine - startLine;
  const newLinesCount = (e.contentChanges[0].text.match(/\n/g) || []).length;
  const lineCountDiff = newLinesCount - selectedLinesCount; //how many newlines were inserted
  const openedFilePath = e.document.fileName.replace(/\\/g, "/");
  event.reminders = event.reminders.map((reminder:Reminder) => {
    
    const r = {...reminder};
    //only change line number if it exists and is below the start of newline insertion
    if (r.filePath && tempReminderState[r.id].lineNumber && tempReminderState[r.id].lineNumber > startLine && openedFilePath === r.filePath) {
      tempReminderState[r.id].lineNumber += lineCountDiff;
      
    }
    return r;
  });
  
}

function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.remind", () => {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          placeHolder: `Lucy please remind me to...`,
          prompt: `Ask Lucy to remind you something for your next coding session 🔔`,
        })
        .then((reminder) => {
          if (!reminder) {
            return;
          }

          createReminder(reminder);
        });
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.reminderDelete",
      (reminder: ReminderTreeItem) => {
        if (reminder) {
          deleteReminder(reminder.reminder);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.remindFile", () => {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          placeHolder: `Lucy remind me that in this file I need to...`,
          prompt: `Ask Lucy to remind you to do something in the current file for your next coding session 🔔`,
        })
        .then(onRemindFileCommand);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.reminderClearAll", () => {
      clearAllReminders();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.reminderShow",
      (reminderID: string) => {
        if (reminderID) {
          const reminder = event.reminders.find((r) => r.id === reminderID);
          if (reminder) showReminder(reminder);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.remindInFile", () => {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          placeHolder: `Lucy remind me that at this line, in this file I need to...`,
          prompt: `Ask Lucy to remind you to do something in the current file, at the current line for your next coding session 🔔`,
        })
        .then(onRemindInFileCommand);
    })
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
