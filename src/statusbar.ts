import * as vscode from "vscode";

import { STATUSBAR_UPDATE_INTERVAL } from "./constants";
import { event } from "./event";
import { WorkspaceStateKey } from "./types";
import { formatTime, getMementoValue } from "./utils";

export let status: vscode.StatusBarItem;
const STATUSBAR_REMINDER_LENGTH = 20;

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
  let text = `${sep} $(loading~spin) ${hrsDiff}h ${minsDiff}m ${sep}`;
  if (remindersCount) {
    const firstReminder = event.reminders[0];
    text += ` Reminders: ${remindersCount} ${sep}`;
  }

  const tooltip =
    "Lucy keeps track of your session time and tasks! The first one on your list is always displayed here.";

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
