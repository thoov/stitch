import * as yargs from 'yargs';

export async function run(argv: string[] = process.argv.slice(2)) {
  let parser = yargs
    .scriptName('embroider-cli')
    .usage(
      `
  A compatabilty and migration CLI for Embroider
  embroider-cli <command> [options]`
    )
    .command({
      command: 'preflight',
      aliases: ['p'],
      describe: 'Runs an Embroider preflight check',
      builder: (yargs) => {
        return yargs.usage('embroider-cli preflight [options]').options({});
      },
      handler: async (argv: yargs.Arguments) => {
        console.log('Preflight check commencing. Prepare for liftoff.');
      },
    })
    .command({
      command: 'migrate',
      aliases: ['m'],
      describe: 'Runs an Embroider migration',
      builder: (yargs) => {
        return yargs.usage('embroider-cli migrate [options]').options({});
      },
      handler: async (argv: yargs.Arguments) => {
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
