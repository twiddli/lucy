import * as vscode from "vscode";
import { DEFAULT_CODING_SESSION_INTERVAL } from "./constants";
import { Reminder, WorkspaceStateKey, WorkspaceStateValue } from "./types";

export function uncapitalize(str1: string) {
  return str1.charAt(0).toLowerCase() + str1.slice(1);
}

export function capitalize(str1: string) {
  return str1.charAt(0).toUpperCase() + str1.slice(1);
}

export function isNewCodingSession(lastActive: Date) {
  const diff = Math.floor(
    Math.abs(lastActive.getTime() - Date.now()) / 1000 / 60
  );
  vscode.window.showInformationMessage(
    `Master... Last focus was ${diff} minutes ago`
  );
  if (diff >= DEFAULT_CODING_SESSION_INTERVAL) {
    return true;
  }
  return false;
}

export function getMementoValue<
  T extends WorkspaceStateValue = WorkspaceStateValue,
  K extends keyof T = keyof WorkspaceStateValue
>(storage: vscode.Memento, key: K): T[K] | undefined {
  let value = storage.get(key as string);

  if (value !== undefined) {
    return value as T[K];
  }

  return undefined;
}

export default {};
