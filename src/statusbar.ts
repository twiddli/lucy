import * as vscode from "vscode";
import { WorkspaceStateKey, WorkspaceStateValue } from "./types";
import { event } from "./event";
import { formatTime, getMementoValue } from "./utils";
import { STATUSBAR_UPDATE_INTERVAL } from "./constants";

let status: vscode.StatusBarItem;

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
    console.log("last active =", last_active, " type=", typeof last_active);
    timeDiff = new Date().getTime() - last_active.getTime();
  }

  let sessionLength = formatTime(last_active ?? new Date());
  // hack, breaks on different locales, probably
  sessionLength = `${sessionLength.split(" ")[0]} ${
    sessionLength.split(" ")[1]
  }`;

  const sep = "$(kebab-vertical)";
  const remindersCount = event.reminders.filter((r) => !r.cleared).length;
  const text = `| Lucy ${sep} $(loading~spin) ${sessionLength} ${sep} Reminders: ${remindersCount} |`;
  const tooltip = "Lucy";

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
