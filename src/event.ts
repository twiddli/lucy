import * as vscode from 'vscode';

import { Reminder, VariableValue } from "./types";

export const initialEventState = {
  sessionActive: false,
  afk: false,
  lastReminder: null as Reminder | null,
  reminders: [] as Reminder[],
  variables: {} as { [key: string]: VariableValue },
  variablesSource: null as vscode.Uri | null,
  variablesLastModified: 0,
  context: null as vscode.ExtensionContext | null,
  config: {} as {
    sessionInterval: number;
  },
};

export type StateKey = keyof typeof initialEventState;

const eventKeyFlag = Object.assign(
  {},
  ...Object.keys(initialEventState).map((k) => ({ [k]: false }))
);

const proxyHandler: ProxyHandler<typeof initialEventState> = {
  set: function (obj, prop: StateKey, value) {
    if (!eventKeyFlag[prop]) {
      eventKeyFlag[prop] = true;
      // The default behavior to store the value
      // @ts-expect-error
      obj[prop] = value;

      try {
        // run listeners
        const listeners = stateListeners[prop];
        // here we run the listeners in order
        if (listeners) {
          for (const l of listeners) {
            // @ts-expect-error
            l(value);
          }
        }
      } finally {
        // after that, unset the flag
        eventKeyFlag[prop] = false;
      }
    }

    // Indicate success
    return true;
  },
};

export const event = new Proxy<typeof initialEventState>(
  { ...initialEventState },
  proxyHandler
);

export const stateListeners: {
  [K in StateKey]?: ((value: (typeof initialEventState)[K]) => void)[];
} = {};

export function subscribe<T extends StateKey>(
  key: T,
  listener: (value: (typeof initialEventState)[T]) => void
) {
  if (!stateListeners[key]) {
    stateListeners[key] = [];
  }

  stateListeners[key]?.push(listener);
}
