export enum WorkspaceStateKey {
  last_active = "last_active",
  reminders = "reminders",
}

export interface Reminder {
  text: string;
  added: Date;
  cleared: boolean;
  clearDate: Date | null;
}

export type WorkspaceStateValue = {
  [WorkspaceStateKey.last_active]: Date;
  [WorkspaceStateKey.reminders]: Reminder[];
};

export type ValueOf<T> = T[keyof T];
