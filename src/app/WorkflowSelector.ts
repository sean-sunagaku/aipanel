export type WorkflowMode = "direct" | "orchestrated";

export class WorkflowSelector {
  select(command: string): WorkflowMode {
    return command === "debug" ? "orchestrated" : "direct";
  }
}
