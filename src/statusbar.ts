import * as vscode from "vscode";
import { WorkspaceStateKey, WorkspaceStateValue } from "./types";
import { event } from "./event";

let status:vscode.StatusBarItem;

export function updateStatus(status: vscode.StatusBarItem): void {
    const enabled = true;
    //var last_active:Date = event.context?.workspaceState.get<Date>(WorkspaceStateKey.last_active)??new Date();
    var last_active = event.context?.workspaceState.get<
        WorkspaceStateValue[WorkspaceStateKey.last_active]
    >(WorkspaceStateKey.last_active);
    var timeDiff;
    if (last_active) {
        console.log('last active =', last_active, ' type=', typeof last_active);
        timeDiff = new Date().getTime() - last_active.getTime();
    }
    else
        timeDiff = 0;
    status.text = `Lucy: session length: ${last_active}`;
    status.tooltip = "Lucy";
    //   status.color = info ? info.color : undefined;

    if (enabled) {
        status.show();
    } else {
        status.hide();
    }
}

export function setupStatusbarItem(context: vscode.ExtensionContext) {
    status = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        1
    );
    context.subscriptions.push(status);
    updateStatus(status);
}
