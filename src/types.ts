export enum WorkspaceStateKey {
  last_active = "last_active",
  last_defocus = "last_defocus",
  last_focus = "last_focus",
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
  [WorkspaceStateKey.last_defocus]: Date;
  [WorkspaceStateKey.last_focus]: Date;
  [WorkspaceStateKey.reminders]: Reminder[];
};

export type ValueOf<T> = T[keyof T];
