import * as vscode from "vscode";
import { WorkspaceStateKey, WorkspaceStateValue } from "./types";
import { event } from "./event";
import { formatTime, getMementoValue } from "./utils";
import { STATUSBAR_UPDATE_INTERVAL } from "./constants";

export let status: vscode.StatusBarItem;
const STATUSBAR_REMINDER_LENGTH = 144;

function statusState() {
  const enabled = true;

  let last_active: Date | undefined;

  if (event.context) {
    last_active = getMementoValue(
      event.context.workspaceState,
      WorkspaceStateKey.last_active
    );
  }

  let timeDiff = 0;
  if (last_active) {
    timeDiff = new Date().getTime() - last_active.getTime();
  }

  let sessionLength = formatTime(last_active ?? new Date());
  // hack, breaks on different locales, probably
  sessionLength = `${sessionLength.split(" ")[0]} ${
    sessionLength.split(" ")[1]
  }`;
  const minsDiff = Math.floor(timeDiff / 1000 / 60) % 60;
  const hrsDiff = Math.floor(timeDiff / 1000 / 60 / 60);
  
  const sep = "$(kebab-vertical)";
  const remindersCount = event.reminders.filter((r) => !r.cleared).length;
  let text = `| Lucy ${sep} $(loading~spin) Current session: ${hrsDiff}h ${minsDiff}m ${sep}`;
  if (remindersCount == 0) {
    text += ` No reminders |`;
  }
  else {
    const firstReminder = event.reminders[0];
    text += ` Reminders: ${remindersCount} ${sep} First reminder: ${firstReminder?.text.substr(0, STATUSBAR_REMINDER_LENGTH)} |`;
  }

  const tooltip = "Lucy keeps track of your session time and tasks, Master! The first one on your list is always displayed here.";

  return {
    enabled,
    text,
    tooltip,
  };
}

export function updateStatus(status: vscode.StatusBarItem): void {
  const s = statusState();

  status.text = s.text;
  status.tooltip = s.tooltip;
  //   status.color = info ? info.color : undefined;

  if (s.enabled) {
    status.show();
  } else {
    status.hide();
  }
}

let timeoutID: NodeJS.Timeout;
let prevStatusState: ReturnType<typeof statusState>;

function updateStatusInterval() {
  if (status) {
    const s = statusState();

    // no change
    if (prevStatusState && prevStatusState.text === s.text) {
      return;
    }

    status.text = s.text;
    status.tooltip = s.tooltip;
    //   status.color = info ? info.color : undefined;

    if (s.enabled) {
      status.show();
    } else {
      status.hide();
    }
    prevStatusState = s;
  }
}

export function setupStatusbarItem(context: vscode.ExtensionContext) {
  status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1
  );
  context.subscriptions.push(status);
  updateStatus(status);
  
  timeoutID = setInterval(updateStatusInterval, STATUSBAR_UPDATE_INTERVAL);
}
