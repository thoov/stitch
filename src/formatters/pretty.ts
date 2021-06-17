import { Log } from 'sarif';
import type { StitchFormatterArgs } from '../types/formatter';

export default class PrettyFormatter {
  args: StitchFormatterArgs;

  constructor(args: StitchFormatterArgs) {
    this.args = args;
  }

  format(log: Log): void {
    const groupedByPackage = new Map();
    const results = log.runs[0].results || [];

    for (const result of results) {
      const stitchResult = result.properties?.stitchResult;

      if (!groupedByPackage.has(stitchResult.packageName)) {
        groupedByPackage.set(stitchResult.packageName, []);
      }

      groupedByPackage.get(stitchResult.packageName).push(stitchResult.packageBreadcrumb);
    }

    if (groupedByPackage.size > 0) {
      console.log('## Preflight Check Results');
      console.log('');
      console.log('The following packages are not compatible with Embroider.');

      for (const [packageName, breadcrumbs] of groupedByPackage) {
        console.log(packageName);

        for (const breadcrumb of breadcrumbs) {
          console.log(`  - ${breadcrumb.join(' > ')}`);
        }
      }
    }
  }
}
