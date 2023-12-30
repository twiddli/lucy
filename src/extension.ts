// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { event } from './event';
import { registerReminder } from './reminder';
import { setupStatusbarItem, status, updateStatus } from './statusbar';
import { WorkspaceStateKey } from './types';
import { getConfig, getMementoValue, isNewCodingSession } from './utils';
import { registerWorkspace } from './workspace';

let afkTimerId: NodeJS.Timeout | undefined;

function detectCodingSession(windowFocused: boolean) {
  if (afkTimerId) {
    clearTimeout(afkTimerId);
  }

  if (windowFocused) {
    event.context?.workspaceState.update(
      WorkspaceStateKey.last_focus,
      new Date()
    );

    let last_defocus: Date | undefined;

    if (event.context) {
      last_defocus = getMementoValue(
        event.context?.workspaceState,
        WorkspaceStateKey.last_defocus
      );
    }

    if (last_defocus) {
      if (isNewCodingSession(last_defocus)) {
        event.sessionActive = false;
      }
    }

    if (!event.sessionActive) {
      event.sessionActive = true;
      event.context?.workspaceState.update(
        WorkspaceStateKey.last_active,
        new Date()
      );
    }

    afkTimerId = setTimeout(() => {
      event.afk = false;
      updateStatus(status);
    }, 1000 * 5); // 5 seconds

    updateStatus(status); //update status immediately
  } else {
    //keep track of window de-focus date/time for session end tracking
    event.context?.workspaceState.update(
      WorkspaceStateKey.last_defocus,
      new Date()
    );

    // set afk timer

    afkTimerId = setTimeout(() => {
      event.afk = true;
      updateStatus(status);
    }, 1000 * 60 * 5); // 5 minutes
  }
}

let focusId: NodeJS.Timeout | undefined;

function setupEvents(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((s) => {
      if (focusId) {
        clearTimeout(focusId);
      }

      const e = { ...s };
      const T_OUT = 5000;

      focusId = setTimeout(() => {
        // sometimes the user will rocus accidentally, so we wait and check if it's still focused
        if (e.focused && !vscode.window.state.focused) {
          return;
        }

        detectCodingSession(e.focused);
      }, T_OUT);
    })
  );
}

function setup(context: vscode.ExtensionContext) {
  registerWorkspace(context);
  registerReminder(context);
  setupStatusbarItem(context);
  setupEvents(context);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  event.context = context;
  event.config = getConfig();

  // this method is called when your extension is activated
  // your extension is activated the very first time the command is executed
  setup(context);

  detectCodingSession(vscode.window.state.focused);
}

// this method is called when your extension is deactivated
export function deactivate() {
  event.sessionActive = false;
  event.context = null;
}
