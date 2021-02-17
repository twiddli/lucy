export enum WorkspaceStateKey {
  active = "active",
  last_active = "last_active",
}

export type WorkspaceStateValue = {
  [WorkspaceStateKey.active]: boolean;
  [WorkspaceStateKey.last_active]: Date;
};

export const DEFAULT_CODING_SESSION_INTERVAL = 1; // 60 * 3; // in minutes

export default {};
