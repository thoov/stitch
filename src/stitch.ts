import { CheckupTaskRunner, getFormatter } from '@checkup/cli';
import { CONFIG_SCHEMA_URL, OutputFormat } from '@checkup/core';
import ora from 'ora';
import * as yargs from 'yargs';

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
        });
      },
      handler: async (options: Options) => {
        if (options.workingDirectory === '.') {
          options.workingDirectory = process.cwd();
        }

        console.log('Migration commencing. Hold on to your hats.');
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
