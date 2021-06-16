import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as ejs from 'ejs';
import type { Log } from 'sarif';
import type { StitchFormatterArgs } from '../types/formatter';

export default class MarkdownFormatter {
  args: StitchFormatterArgs;

  private get template(): string {
    return readFileSync(join(__dirname, '..', 'templates', 'embroider-preflight.md.ejs'), {
      encoding: 'utf-8',
    });
  }

  constructor(args: StitchFormatterArgs) {
    this.args = args;
  }

  format(log: Log): void {
    const outputPath = join(this.args.cwd, 'embroider-preflight.md');
    const markdownReport = ejs.render(this.template, {
      projectName: 'Fake Project',
      results: this.getResults(log),
    });

    writeFileSync(outputPath, markdownReport);

    process.stdout.write(`Embroider preflight check written to ${outputPath}`);
  }

  private getResults(result: Log) {
    const results = result.runs[0].results;

    if (!results) {
      return [];
    }

    return results.map((result) => {
      const stitchResult = result?.properties?.stitchResult;

      return {
        packageName: stitchResult.packageName,
        packageVersion: stitchResult.packageVersion,
        packageBreadcrumb: stitchResult.packageBreadcrumb,
      };
    });
  }
}
