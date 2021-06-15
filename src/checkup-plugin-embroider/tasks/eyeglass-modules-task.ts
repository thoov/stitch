import { BaseTask, Task } from '@checkup/core';
import { Result } from 'sarif';
import findBadEyeglassModules from '../helpers/find-bad-eyeglass-modules';

export default class EyeglassModulesCheck extends BaseTask implements Task {
  taskName = 'eyeglass-modules-check';
  taskDisplayName = 'Eyeglass Modules Check';
  description = 'Checks if in repo addons are correctly configured as eyeglass modules for Embroider';
  category = 'embroider';

  async run(): Promise<Result[]> {
    const problematicAddons = await findBadEyeglassModules(this.context.options.cwd);
    const results = problematicAddons.map(addon => {
      return {
        message: {
          text: `Detected in repo addon: ${addon} that needs to be updated to an eyeglass module.`,
        },
        ruleId: this.taskName,
        properties: {
          taskDisplayName: this.taskDisplayName,
          category: this.category,
          stitchResult: {
            addon,
          },
        },
      }
    });

    return results;
  }
}
