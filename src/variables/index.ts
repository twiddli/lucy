import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { event, subscribe } from "../event";
import { VariableType, VariableValue } from "../types";

let variablesTreeProvider: VariablesTreeProvider;

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function childrenFilter(parentKey: string) {
  return (key: string) =>
    !!key.match(new RegExp(`^${escapeRegExp(parentKey)}\/[^\/]+$`));
}

export class VariablesTreeProvider
  implements vscode.TreeDataProvider<VariablesTreeItem>
{
  constructor(public readonly storagePath: string) {}

  getTreeItem(element: VariablesTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: VariablesTreeItem
  ): Thenable<VariablesTreeItem[]> | undefined {
    if (element?.variable?.value !== undefined) {
      return undefined;
    }
    return this.updateVariables(element?.variable?.key ?? "");
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    VariablesTreeItem | undefined | null | void
  > = new vscode.EventEmitter<VariablesTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    VariablesTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private sortVariables(a: VariableValue, b: VariableValue): number {
    return a.key.localeCompare(b.key);
  }

  private async readSource(uri: vscode.Uri) {
    const r = await vscode.workspace.fs.stat(uri).then((stat) => {
      if (stat.mtime > event.variablesLastModified) {
        const c = vscode.workspace.fs.readFile(uri).then((content) => {
          const json = JSON.parse(content.toString());
          return json as Record<string, any>;
        });
        event.variablesLastModified = stat.mtime;
        return c;
      }
      return null;
    });

    if (!r) {
      return event.variables;
    }

    const v = this.parseSource(r);
    event.variables = v;
    return v;
  }

  private parseSource(source: Record<string, any>) {
    const v = {} as { [key: string]: VariableValue };

    const parseKeys = (parentKey: string, obj: object) => {
      for (const [k, value] of Object.entries(obj)) {
        const key = parentKey ? `${parentKey}/${k}` : `/${k}`;
        const e = event.variables?.[key] ?? {};
        if (typeof value === "object" && !Array.isArray(value)) {
          parseKeys(key, value);
          v[key] = {
            name: k,
            ...e,
            key,
            value: undefined,
          };
        } else {
          v[key] = {
            name: k,
            // @ts-expect-error
            type: this.guessVariableType(value),
            ...e,
            key,
            value: value,
          };
        }
      }
    };

    parseKeys("", source);
    return v;
  }

  private guessVariableType(value: any): VariableType {
    // #rrggbb and rgba(0, 0, 0, 0) or rbg(0, 0, 0)
    if (
      typeof value === "string" &&
      value.match(/^(#[0-9a-f]{6}|rgba?\(\d+,\s*\d+,\s*\d+(,\s*\d+)?\))$/i)
    ) {
      return "color";
    }
    return "string";
  }

  private async updateVariables(keyPath?: string) {
    if (!event.variablesSource) {
      return [];
    }

    const variables = await this.readSource(event.variablesSource);

    const cFilter =
      keyPath !== undefined ? childrenFilter(keyPath) : () => true;
    return Object.entries(variables)
      .filter(([key, value]) => {
        if (value.hidden) {
          return false;
        }
        return cFilter(key);
      })
      .sort((a, b) => this.sortVariables(a[1], b[1]))
      .map(([key, value]) => {
        return new VariablesTreeItem(
          value,
          vscode.TreeItemCollapsibleState.Collapsed,
          this.storagePath
        );
      });
  }
}

class VariablesTreeItem extends vscode.TreeItem {
  constructor(
    public readonly variable: VariableValue,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    private readonly storagePath: string
  ) {
    super(`${variable.name ?? variable.key}`, collapsibleState);

    this.id = variable.key;
    this.contextValue = "variable";
    this.label = `${variable.name ?? variable.key}`;
    this.tooltip = `${variable.key}`;

    if (variable.value !== undefined) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.None;
      this.tooltip = `${variable.key} (type=${variable.type}): ${variable.value}`;
      this.description = `${variable.value}`;
      if (variable.type === "color") {
        this.iconPath = this.createColorIcon(variable.value as string);
      }
    }
  }

  private createColorIcon(color: string) {
    const iconPath = path.join(this.storagePath, "colors", `${color}.svg`);
    if (fs.existsSync(iconPath)) {
      return iconPath;
    } else {
      fs.mkdirSync(path.join(path.dirname(iconPath)), { recursive: true });
    }
    const iconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="8" fill="${color}"/></svg>`;
    try {
      fs.writeFileSync(iconPath, iconContent);
    } catch (e) {
      console.log(e);
    }

    return iconPath;
  }
}

function hideVariable(key: string) {
  const vars = { ...event.variables };
  let vKeys = [key];

  while (vKeys.length > 0) {
    const key = vKeys.pop()!;
    const v = vars[key];
    if (v) {
      if (v.value === undefined) {
        vKeys.push(...Object.keys(event.variables).filter(childrenFilter(key)));
      } else {
        v.hidden = true;
      }
    }
  }

  event.variables = vars;
  variablesTreeProvider.refresh();
}

function setVariableType(keys: string[], type: VariableType) {
  const vars = { ...event.variables };
  let vKeys = [...keys];
  while (vKeys.length > 0) {
    const key = vKeys.pop()!;
    const v = vars[key];
    if (v) {
      if (v.value === undefined) {
        vKeys.push(...Object.keys(vars).filter(childrenFilter(key)));
      } else {
        v.type = type;
      }
    }
  }
  event.variables = vars;
  variablesTreeProvider.refresh();
}

function showAllVariables() {
  const vars = { ...event.variables };
  for (const key of Object.keys(vars)) {
    const v = vars[key];
    if (v) {
      v.hidden = false;
    }
  }
  event.variables = vars;
  variablesTreeProvider.refresh();
}

function chooseVariablesSource() {
  vscode.window
    .showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: "Select Variables Source",
      defaultUri: event.variablesSource
        ? event.variablesSource
        : vscode.workspace.workspaceFolders?.[0].uri,
      filters: {
        json: ["json"],
      },
    })
    .then((uris) => {
      if (uris && uris.length > 0) {
        event.variablesSource = uris[0];
      }
    });
}

export function registerVariables(context: vscode.ExtensionContext) {
  const storagePath = context.globalStorageUri;

  const source =
    context.workspaceState.get<null | string>("variablesSource") ?? null;
  event.variablesSource = source ? vscode.Uri.parse(source) : null;

  variablesTreeProvider = new VariablesTreeProvider(storagePath.fsPath);

  subscribe("variablesSource", () => {
    variablesTreeProvider.refresh();
    context.workspaceState.update(
      "variablesSource",
      event.variablesSource?.toString?.() ?? null
    );
  });

  vscode.window.registerTreeDataProvider(
    "lucy.variables",
    variablesTreeProvider
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.variables.refresh", () => {
      variablesTreeProvider.refresh();
    }),
    vscode.commands.registerCommand("lucy.variables.refresh.title", () => {
      variablesTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.variables.source",
      chooseVariablesSource
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.variables.set.hidden",
      (item: VariablesTreeItem) => hideVariable(item.variable.key)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.variables.set.type.color.all", () =>
      setVariableType(Object.keys(event.variables), "color")
    ),
    vscode.commands.registerCommand(
      "lucy.variables.set.type.color.all.title",
      () => setVariableType(Object.keys(event.variables), "color")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.variables.set.type.color",
      (item: VariablesTreeItem) => setVariableType([item.variable.key], "color")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.variables.set.type.string.all", () =>
      setVariableType(Object.keys(event.variables), "string")
    ),
    vscode.commands.registerCommand(
      "lucy.variables.set.type.string.all.title",
      () => setVariableType(Object.keys(event.variables), "string")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lucy.variables.set.type.string",
      (item: VariablesTreeItem) =>
        setVariableType([item.variable.key], "string")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lucy.variables.show", showAllVariables),
    vscode.commands.registerCommand(
      "lucy.variables.show.title",
      showAllVariables
    )
  );
}
