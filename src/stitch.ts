import { CheckupTaskRunner, getFormatter } from '@checkup/cli';
import { CONFIG_SCHEMA_URL, OutputFormat } from '@checkup/core';
import ora from 'ora';
import * as yargs from 'yargs';
import path from 'path';
import fs from 'fs';
import CodemodCLI from 'codemod-cli';
import execa from 'execa';

interface StitchArguments {
  workingDirectory: string;
}

type Options = StitchArguments & yargs.Arguments;

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const parser = yargs
    .scriptName('stitch')
    .usage(
      `
  A compatabilty and migration CLI for Embroider

  stitch <command> [options]`
    )
    .command({
      command: 'preflight',
      aliases: ['p'],
      describe: 'Runs an Embroider preflight check',
      builder: (yargs: any) => {
        return yargs.usage('stitch preflight [options]').options({
          'working-directory': {
            alias: 'cwd',
            describe:
              'Path to a directory that should be considered as the current working directory.',
            type: 'string',
            // defaulting to `.` here to refer to `process.cwd()`, setting the default to `process.cwd()` itself
            // would make our snapshots unstable (and make the help output unaligned since most directory paths
            // are fairly deep)
            default: '.',
          },
        });
      },
      handler: async (options: Options) => {
        if (options.workingDirectory === '.') {
          options.workingDirectory = process.cwd();
        }

        const spinner = ora().start('Preflight check commencing. Prepare for liftoff.');
        const config = {
          $schema: CONFIG_SCHEMA_URL,
          excludePaths: [],
          plugins: ['checkup-plugin-embroider'],
          tasks: {},
        };

        const taskRunner = new CheckupTaskRunner({
          config,
          cwd: options.workingDirectory,
          pluginBaseDir: __dirname,
        });

        const result = await taskRunner.run();

        const formatter = getFormatter({
          cwd: options.workingDirectory,
          format: OutputFormat.json,
        });

        spinner.stop();
        formatter.format(result);
      },
    })
    .command({
      command: 'migrate',
      aliases: ['m'],
      describe: 'Runs an Embroider migration',
      builder: (yargs) => {
        return yargs.usage('stitch migrate [options]').options({
          'working-directory': {
            alias: 'cwd',
            describe:
              'Path to a directory that should be considered as the current working directory.',
            type: 'string',
            // defaulting to `.` here to refer to `process.cwd()`, setting the default to `process.cwd()` itself
            // would make our snapshots unstable (and make the help output unaligned since most directory paths
            // are fairly deep)
            default: '.',
          },
          'skip-dependencies': {
            describe:
              'Do not install dependencies.',
            type: 'boolean',
            default: false,
          }
        });
      },
      handler: async (options: Options) => {
        if (options.workingDirectory === '.') {
          options.workingDirectory = process.cwd();
        }

        let packageManager = 'npm';

        try {
          if (fs.existsSync(path.join(options.workingDirectory, 'yarn.lock'))) {
            console.log('Detected yarn.lock, using yarn to install dependencies');
            packageManager = 'yarn';
          }
        } catch(error) { // eslint-disable-line unicorn/prefer-optional-catch-binding
          console.log('Did not detect yarn.lock, using npm to install dependencies');
        }

        const installCommand = packageManager === 'yarn' ? 'add' : 'install';

        try {
          if (!options.skipDependencies) {
            console.log('Installing dependencies...');
            await execa(packageManager, [installCommand, '-D', '@embroider/core', '@embroider/compat', '@embroider/webpack']);
          }

          await CodemodCLI.runTransform(
            path.join(__dirname, 'codemods', 'tranforms'),
            'setup', /* transform name */
            'ember-cli-build.js', /* paths or globs */
            'js'
          );
        } catch (error) {
          // TODO: do soomething in the error case
          console.error(error.message);
        }
      },
    })
    .showHelpOnFail(false)
    .wrap(yargs.terminalWidth())
    .help()
    .version();

  if (argv.length === 0) {
    parser.showHelp();
  } else {
    parser.parse(argv);
  }
}
