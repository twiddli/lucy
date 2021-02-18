export enum WorkspaceStateKey {
  last_active = "last_active",
  reminders = "reminders",
}

export interface Reminder {
  id: string;
  text: string;
  added: Date;
  active: boolean;
  cleared: boolean;
  clearDate: Date | null;
}

export type WorkspaceStateValue = {
  [WorkspaceStateKey.last_active]: Date;
  [WorkspaceStateKey.reminders]: Reminder[];
};

export type ValueOf<T> = T[keyof T];

export type PartialExcept<T, K extends keyof T> = Pick<T, K> & Partial<T>;
