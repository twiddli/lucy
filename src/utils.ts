import * as vscode from "vscode";
import { DEFAULT_CODING_SESSION_INTERVAL } from "./constants";

export function uncapitalize(str1: string) {
  return str1.charAt(0).toLowerCase() + str1.slice(1);
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

export default {};
