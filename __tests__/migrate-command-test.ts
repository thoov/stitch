import '@microsoft/jest-sarif';
import execa from 'execa';
import { Project } from 'fixturify-project';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

describe('migrate-command-test', () => {
  let project: Project;

  beforeEach(function () {
    project = new Project('fake-project', '0.0.1');
  });

  afterEach(function () {
    process.chdir(ROOT);
    project.dispose();
  });

  it('can invoke the migrate command with default ember-cli-build.js file', async () => {
    const inputFile = fs.readFileSync(
      path.join(__dirname, 'transforms', 'setup', '__fixtures__', 'basic.input.js')
    );

    project.files = { 'ember-cli-build.js': inputFile.toString() };
    project.writeSync();

    const result = await run(['migrate', '--skip-dependencies']);

    expect(result.exitCode).toEqual(0);
    expect(stripWhitespace(removeTimeElapsed(removeANSIescape(result.stdout)))).toEqual(`Processing 1 files...
Spawning 1 workers...
Sending 1 files to free worker...
All done.
Results:
0 errors
0 unmodified
0 skipped
1 ok`);
  });

  it('rerunning the migrate command produces the correct output', async () => {
    const inputFile = fs.readFileSync(
      path.join(__dirname, 'transforms', 'setup', '__fixtures__', 'basic.output.js')
    );

    project.files = { 'ember-cli-build.js': inputFile.toString() };
    project.writeSync();

    const result = await run(['migrate', '--skip-dependencies']);

    expect(result.exitCode).toEqual(0);
    expect(stripWhitespace(removeTimeElapsed(removeANSIescape(result.stdout)))).toEqual(`Processing 1 files...
Spawning 1 workers...
Sending 1 files to free worker...
All done.
Results:
0 errors
1 unmodified
0 skipped
0 ok`);
  });

  function run(args: string[], options: execa.Options = {}) {
    const defaults = {
      reject: false,
      cwd: project.baseDir,
    };

    return execa(
      process.execPath,
      [require.resolve('../bin/stitch.js'), ...args],
      Object.assign({}, defaults, options)
    );
  }
});


function removeANSIescape(str: string) {
  return str.replace(
    /[\u001B\u009B][#();?[]*(?:\d{1,4}(?:;\d{0,4})*)?[\d<=>A-ORZcf-nqry]/g, '');
}

function removeTimeElapsed(str: string) {
  return str.replace(/\r?\n?[^\n\r]*$/, '');
}

function stripWhitespace(str: string) {
  return str.split('\n').map(line => line.trim()).join('\n');
}
