#!/usr/bin/env node
import { runCommand, listCommands, getCommandHelp, getAllCommandsHelp } from './commands.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  const cmds = listCommands();
  console.log('Usage: jkan <command> [options]');
  console.log('       jkan <command> --help\n');
  console.log('Commands:');
  for (const cmd of cmds) {
    console.log(`  ${cmd}`);
  }
  console.log('\nAll output is JSON. Errors are written to stderr.');
  console.log('Set JOPLIN_API_TOKEN for commands that access the Joplin API.');
  console.log('\nRun "jkan help-all" for detailed help on all commands.');
  process.exit(0);
}

// jkan help <command>
if (command === 'help') {
  const subcommand = args[1];
  if (!subcommand) {
    console.log(getAllCommandsHelp());
  } else {
    console.log(getCommandHelp(subcommand));
  }
  process.exit(0);
}

runCommand(command, args.slice(1));
