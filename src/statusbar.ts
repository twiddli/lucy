import * as vscode from 'vscode';

import { STATUSBAR_UPDATE_INTERVAL } from './constants';
import { event } from './event';
import { WorkspaceStateKey } from './types';
import { formatTime, getMementoValue } from './utils';

export let status: vscode.StatusBarItem;
const STATUSBAR_REMINDER_LENGTH = 20;

let lastTimeDiff = 0;
function statusState() {
  const enabled = true;
  let paused = event.afk;

  let last_active: Date | undefined;

  if (event.context) {
    last_active = getMementoValue(
      event.context.workspaceState,
      WorkspaceStateKey.last_active
    );
  }

  let timeDiff = lastTimeDiff;
  if (last_active && !paused) {
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

  let prefix = paused ? "(AFK)" : "$(loading-spin)";

  let text = `${sep} ${prefix} ${hrsDiff}h ${minsDiff}m ${sep}`;

  let firstReminderText = "";
  if (remindersCount) {
    firstReminderText = event.reminders.find((r) => !r.cleared)?.text ?? "";
    text += ` Reminders: ${remindersCount} ${sep}`;
  }

  const tooltip =
    "Lucy keeps track of your session time and tasks!" +
    (firstReminderText
      ? `\nNext reminder:\n- ${firstReminderText}`
      : "\nThe first one on your list is always displayed here.");

  lastTimeDiff = timeDiff;

  return {
    enabled,
    text,
    paused,
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
let prevStatusState = "";

function updateStatusInterval() {
  if (status) {
    const s = statusState();
    const delta = JSON.stringify(s);

    // no change
    if (delta === prevStatusState) {
      return;
    }

    updateStatus(status);

    prevStatusState = delta;
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

export function disposeStatusbarItem() {
  clearInterval(timeoutID);
  status.dispose();
}
