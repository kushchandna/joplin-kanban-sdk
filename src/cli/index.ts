#!/usr/bin/env node
import { runCommand, listCommands } from './commands.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  const cmds = listCommands();
  console.log('Usage: jkan <command> [options]\n');
  console.log('Commands:');
  for (const cmd of cmds) {
    console.log(`  ${cmd}`);
  }
  console.log('\nAll output is JSON. Errors are written to stderr.');
  console.log('Set JOPLIN_API_TOKEN for commands that access the Joplin API.');
  process.exit(0);
}

runCommand(command, args.slice(1));
