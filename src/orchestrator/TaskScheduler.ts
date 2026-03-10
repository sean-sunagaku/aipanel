import type { PlanTaskSpec } from "../shared/contracts.js";

export class TaskScheduler {
  order(tasks: PlanTaskSpec[]): PlanTaskSpec[] {
    const remaining = [...tasks];
    const ordered: PlanTaskSpec[] = [];
    const seen = new Set<string>();

    while (remaining.length > 0) {
      const nextIndex = remaining.findIndex((task) =>
        (task.dependsOn ?? []).every((dependency) => seen.has(dependency)),
      );

      const indexToUse = nextIndex >= 0 ? nextIndex : 0;
      const [task] = remaining.splice(indexToUse, 1);
      if (!task) {
        break;
      }

      ordered.push(task);
      seen.add(task.taskKind);
    }

    return ordered;
  }
}
