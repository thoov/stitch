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
    expect(result.stdout).toMatchInlineSnapshot(`
      "{
        \\"version\\": \\"2.1.0\\",
        \\"$schema\\": \\"https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json\\",
        \\"properties\\": {
          \\"project\\": {
            \\"name\\": \\"fake-project\\",
            \\"version\\": \\"0.0.1\\",
            \\"repository\\": {
              \\"totalCommits\\": 0,
              \\"totalFiles\\": 0,
              \\"age\\": \\"0 days\\",
              \\"activeDays\\": \\"0 days\\",
              \\"linesOfCode\\": {
                \\"types\\": [
                  {
                    \\"total\\": 3,
                    \\"extension\\": \\"js\\"
                  }
                ],
                \\"total\\": 3
              }
            }
          },
          \\"cli\\": {
            \\"configHash\\": \\"26099139cc4ef53ea673f75dfe17aa9e\\",
            \\"config\\": {
              \\"$schema\\": \\"https://raw.githubusercontent.com/checkupjs/checkup/master/packages/core/src/schemas/config-schema.json\\",
              \\"excludePaths\\": [],
              \\"plugins\\": [
                \\"checkup-plugin-embroider\\"
              ],
              \\"tasks\\": {}
            },
            \\"version\\": \\"0.0.0\\",
            \\"schema\\": 1,
            \\"options\\": [
              \\"--config.$schema\\",
              \\"https://raw.githubusercontent.com/checkupjs/checkup/master/packages/core/src/schemas/config-schema.json\\",
              \\"--config.plugins\\",
              \\"checkup-plugin-embroider\\",
              \\"--cwd\\",
              \\"/private/var/folders/5m/4ybwhyvn3979lm2223q_q22c000gyd/T/tmp-13952fvDZXlLBCuwZ\\",
              \\"--pluginBaseDir\\",
              \\"/Users/scalvert/workspace/linkedin/embroider-cli/lib\\"
            ]
          },
          \\"analyzedFiles\\": [
            \\"index.js\\",
            \\"package.json\\"
          ],
          \\"analyzedFilesCount\\": 2,
          \\"actions\\": [],
          \\"timings\\": {
            \\"embroider/dependency-check\\": 0.000046064
          }
        },
        \\"runs\\": [
          {
            \\"results\\": [
              {
                \\"message\\": {
                  \\"text\\": \\"Dependency result\\"
                },
                \\"ruleId\\": \\"dependency-check\\",
                \\"properties\\": {
                  \\"taskDisplayName\\": \\"Dependency Check\\",
                  \\"category\\": \\"embroider\\"
                }
              }
            ],
            \\"invocations\\": [
              {
                \\"arguments\\": [
                  \\"--config.$schema\\",
                  \\"https://raw.githubusercontent.com/checkupjs/checkup/master/packages/core/src/schemas/config-schema.json\\",
                  \\"--config.plugins\\",
                  \\"checkup-plugin-embroider\\",
                  \\"--cwd\\",
                  \\"/private/var/folders/5m/4ybwhyvn3979lm2223q_q22c000gyd/T/tmp-13952fvDZXlLBCuwZ\\",
                  \\"--pluginBaseDir\\",
                  \\"/Users/scalvert/workspace/linkedin/embroider-cli/lib\\"
                ],
                \\"executionSuccessful\\": true,
                \\"endTimeUtc\\": \\"2021-05-21T22:25:18.696Z\\",
                \\"toolExecutionNotifications\\": [],
                \\"startTimeUtc\\": \\"2021-05-21T22:25:18.064Z\\"
              }
            ],
            \\"tool\\": {
              \\"driver\\": {
                \\"name\\": \\"Checkup\\",
                \\"rules\\": [
                  {
                    \\"id\\": \\"dependency-check\\",
                    \\"shortDescription\\": {
                      \\"text\\": \\"Dependency Check\\"
                    },
                    \\"properties\\": {
                      \\"enabled\\": true,
                      \\"category\\": \\"embroider\\"
                    }
                  }
                ],
                \\"language\\": \\"en-US\\",
                \\"informationUri\\": \\"https://github.com/checkupjs/checkup\\",
                \\"version\\": \\"0.0.0\\"
              }
            }
          }
        ]
      }"
    `);
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
