import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as ejs from 'ejs';
import { FormatterArgs } from '@checkup/core';
import type { Log } from 'sarif';

type MarkdownFormatterArgs = Omit<FormatterArgs, 'format' | 'writer'>;

export default class MarkdownFormatter {
  args: MarkdownFormatterArgs;

  private get template(): string {
    return readFileSync(join(__dirname, 'templates', 'embroider-preflight.md.ejs'), {
      encoding: 'utf-8',
    });
  }

  constructor(args: MarkdownFormatterArgs) {
    this.args = args;
  }

  format(result: Log): void {
    const outputPath = join(this.args.cwd, 'embroider-preflight.md');
    const markdownReport = ejs.render(this.template, {
      projectName: 'Fake Project',
      results: this.getResults(result),
    });

    writeFileSync(outputPath, markdownReport);
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
