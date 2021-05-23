import '@microsoft/jest-sarif';
import execa from 'execa';
import { Project } from 'fixturify-project';

const ROOT = process.cwd();

describe('cli-test', () => {
  let project: Project;

  beforeEach(function () {
    project = new Project('fake-project', '0.0.1');
    project.writeSync();
  });

  afterEach(function () {
    process.chdir(ROOT);
    project.dispose();
  });

  it('displays help when no commmand is provided', async () => {
    const result = await run([]);

    expect(result.exitCode).toEqual(0);
    expect(result.stderr).toMatchInlineSnapshot(`
      "
           A compatabilty and migration CLI for Embroider

           stitch <command> [options]

      Commands:
        stitch preflight  Runs an Embroider preflight check  [aliases: p]
        stitch migrate    Runs an Embroider migration  [aliases: m]

      Options:
        --help     Show help  [boolean]
        --version  Show version number  [boolean]"
    `);
  });

  it('can invoke the preflight command', async () => {
    const result = await run(['preflight']);

    expect(result.exitCode).toEqual(0);
    expect(JSON.parse(result.stdout)).toBeValidSarifLog();
  });

  it('can invoke the migrate command', async () => {
    const result = await run(['migrate']);

    expect(result.exitCode).toEqual(0);
    expect(result.stdout).toMatchInlineSnapshot(`"Migration commencing. Hold on to your hats."`);
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
