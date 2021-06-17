import { readJsonSync } from 'fs-extra';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createTmpDir } from '../__utils__/tmp-dir';
import MarkdownFormatter from '../../src/formatters/markdown';

const ROOT = process.cwd();

describe('markdown-formatter-test', () => {
  let tmp: string;

  beforeEach(function () {
    tmp = createTmpDir();
  });

  afterEach(function () {
    process.chdir(ROOT);
  });

  it('can create a markdown report in the specific directory without results', () => {
    const outputPath = join(tmp, 'embroider-preflight.md');
    const formatter = new MarkdownFormatter({
      cwd: tmp,
    });
    const results = readJsonSync(join(__dirname, '..', '__fixtures__', 'markdown-results.sarif'));

    // explicitly remove all results
    results.runs[0].results = [];

    formatter.format(results);

    expect(existsSync(outputPath)).toEqual(true);
    expect(readFileSync(outputPath, { encoding: 'utf-8' })).toMatchInlineSnapshot(`
      "# Embroider Preflight Report for Fake Project

      ## Preflight Check Results


      All packages are compatible!
      "
    `);
  });

  it('can create a markdown report in the specific directory with results', () => {
    const outputPath = join(tmp, 'embroider-preflight.md');
    const formatter = new MarkdownFormatter({
      cwd: tmp,
    });
    const results = readJsonSync(join(__dirname, '..', '__fixtures__', 'markdown-results.sarif'));

    formatter.format(results);

    expect(existsSync(outputPath)).toEqual(true);
    expect(readFileSync(outputPath, { encoding: 'utf-8' })).toMatchInlineSnapshot(`
      "# Embroider Preflight Report for Fake Project

      ## Preflight Check Results


      The following packages are not compatible with Embroider.

      ### ember-a11y-testing
      <details>
        <summary>Package paths</summary>
        my-project &gt; ember-a11y-testing
      </details>

      "
    `);
  });
});
