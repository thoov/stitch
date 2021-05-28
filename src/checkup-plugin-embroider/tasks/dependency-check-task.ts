import { BaseTask, Task } from '@checkup/core';
import { Result } from 'sarif';
import findBadPackages from '../helpers/find-bad-packages';
import packageCompatibilityJSON from '../helpers/package-compatibility.json';

interface PackageCheck {
  [index: string]: string;
}

export default class DependencyCheck extends BaseTask implements Task {
  taskName = 'dependency-check';
  taskDisplayName = 'Dependency Compatibility Check';
  description = 'Dependency version compatibility checker for Embroider';
  category = 'embroider';

  async run(): Promise<Result[]> {
    const packageCompatibility: PackageCheck  = packageCompatibilityJSON;
    const pkgs = await findBadPackages(this.context.options.cwd, packageCompatibility);
    const results = [];

    for (const pkg of pkgs) {
      results.push({
        message: { text: `Detected version of ${pkg.packageName} as ${pkg.packageVersion} but ${packageCompatibility[pkg.packageName]} found in ${pkg.packageBreadcrumb.join(' > ')}.` },
        ruleId: this.taskName,
        properties: {
          taskDisplayName: this.taskDisplayName,
          category: this.category,
          stitchResult: {
            packageName: pkg.packageName,
            packageVersion: pkg.packageVersion,
            packageBreadcrumb: pkg.packageBreadcrumb
          }
        },
      });
    }

    return results;
  }
}
