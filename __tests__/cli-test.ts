import execa from 'execa';
import { Project } from 'fixturify-project';

describe('cli-test', () => {
  let project: Project;

  beforeEach(function () {
    project = new Project('fake-project', '0.0.1');
    project.writeSync();
  });

  afterEach(function () {
    project.dispose();
  });

  it('can invoke the preflight command', async () => {
    const result = await run(['preflight']);

    expect(result.exitCode).toEqual(0);
    expect(result.stdout).toMatchInlineSnapshot(
      `"Preflight check commencing. Prepare for liftoff."`
    );
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
      [require.resolve('../bin/embroider-cli.js'), ...args],
      Object.assign({}, defaults, options)
    );
  }
});
