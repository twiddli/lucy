import { join } from 'path';
import { format } from 'timeago.js';
import * as vscode from 'vscode';

import { event } from './event';
import Sentencer from './sentencer';
import {
  PartialExcept,
  Reminder,
  WorkspaceStateKey,
  WorkspaceStateValue,
} from './types';

const compliments = {
  encouragement() {
    const l = [
      "you can do it",
      "I believe in you master",
      "you're almost there",
      "keep up the good work master",
    ];
    return l[Math.floor(Math.random() * l.length)];
  },
  compliment() {
    const l = [
      "way to go master",
      "good job master",
      "excellent work as always master",
    ];
    return l[Math.floor(Math.random() * l.length)];
  },
  compliment_c() {
    return capitalize(compliments.compliment());
  },
  welcome() {
    const l = [
      "Master... It's good to see you",
      "Master, work hard!",
      "Ready for some work, master?",
    ];
    return l[Math.floor(Math.random() * l.length)];
  },
};

const sentencer = new Sentencer(compliments);

export function say(s: string): string {
  return sentencer.make(s);
}

export function uncapitalize(str1: string) {
  return str1.charAt(0).toLowerCase() + str1.slice(1);
}

export function capitalize(str1: string) {
  return str1.charAt(0).toUpperCase() + str1.slice(1);
}

export function isNewCodingSession(lastActive: Date) {
  const diff = Math.floor(
    Math.abs(lastActive.getTime() - new Date().getTime()) / 1000 / 60
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
    if (key === WorkspaceStateKey.last_active) {
      value = new Date(value as string);
    }

    if (key === WorkspaceStateKey.last_defocus) {
      value = new Date(value as string);
    }

    if (key === WorkspaceStateKey.last_focus) {
      value = new Date(value as string);
    }

    if (key === WorkspaceStateKey.reminders) {
      value = (value as Reminder[]).map((r) => {
        r.added = new Date(r.added);
        if (r.clearDate) {
          r.clearDate = new Date(r.clearDate);
        }
        return r;
      });
    }

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

export function formatTime(d: Parameters<typeof format>[0]) {
  return format(d, "en_US");
}

export function showInformationMessage(message: string, ...items: string[]) {
  return vscode.window
    .showInformationMessage(message, ...[...items, "Hide"])
    .then((s) => {
      if (s === "Hide") {
      }
      return s;
    });
}

export default {};
