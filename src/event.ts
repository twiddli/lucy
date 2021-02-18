import * as vscode from "vscode";
import { ValueOf, Reminder } from "./types";

export const initialEventState = {
  sessionActive: false,
  lastReminder: null as Reminder | null,
  reminders: [] as Reminder[],
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
      obj[prop] = value;

      try {
        // run listeners
        const listeners = stateListeners[prop];
        // here we run the listeners in order
        if (listeners) {
          for (const l of listeners) {
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

export const stateListeners: Partial<
  Record<
    keyof typeof initialEventState,
    ((value: ValueOf<typeof initialEventState>) => void)[]
  >
> = {};

export function subscribe<T extends StateKey>(
  key: T,
  listener: (value: typeof initialEventState[T]) => void
) {
  if (!stateListeners[key]) {
    stateListeners[key] = [];
  }

  stateListeners[key]?.push(listener);
}
