import * as vscode from "vscode";
import { join } from "path";
import {
  Reminder,
  WorkspaceStateKey,
  WorkspaceStateValue,
  PartialExcept,
} from "./types";
import { event } from "./event";

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
  if (diff >= event.config.sessionInterval) {
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
    if (key === WorkspaceStateKey.last_active)
      value = new Date(value as string);

    return value as T[K];
  }

  return undefined;
}

// https://stackoverflow.com/a/6248722
export function generateID(): string {
  // to ensure the random number provide enough bits.
  let firstPart: any = (Math.random() * 46656) | 0;
  let secondPart: any = (Math.random() * 46656) | 0;
  firstPart = ("000" + firstPart.toString(36)).slice(-3);
  secondPart = ("000" + secondPart.toString(36)).slice(-3);
  return firstPart + secondPart;
}

export function getPath(path: string) {
  return join(__dirname, "..", path);
}

export function updateArrayItem<T extends { id: any }>(
  properties: PartialExcept<T, "id">,
  target: T[]
) {
  const itemIdx = target.findIndex((v) => v.id === properties.id);
  let item = target.find((v) => v.id === properties.id);
  if (item) {
    item = { ...item, ...properties };
    const t = [...target];
    t[itemIdx] = item;
    return t;
  }
  return target;
}

export function getConfig(): typeof event.config {
  const cfg = vscode.workspace.getConfiguration("lucy");
  return {
    sessionInterval: cfg.get("sessionInterval") as number,
  };
}

export default {};
