import { BaseTask, Task } from '@checkup/core';
import { Result } from 'sarif';

export default class DependencyCheck extends BaseTask implements Task {
  taskName = 'dependency-check';
  taskDisplayName = 'Dependency Check';
  description = 'Dependency version checker for Embroider preflight';
  category = 'embroider';

  async run(): Promise<Result[]> {
    return [
      {
        message: { text: `Dependency result` },
        ruleId: this.taskName,
        properties: {
          taskDisplayName: this.taskDisplayName,
          category: this.category,
        },
      },
    ];
  }
}
