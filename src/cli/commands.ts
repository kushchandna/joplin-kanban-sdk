import {
  parse_board, serialize_board, is_kanban_board,
  add_column, remove_column, rename_column, move_column, list_columns,
  add_card, remove_card, move_card, move_cards, rename_card, update_card_body, find_cards, list_cards,
  get_board_settings, update_board_settings,
} from '../core/index.js';
import {
  JoplinClient, DEFAULT_CONFIG,
  fetch_board, save_board, list_boards, create_board,
  convert_to_external, convert_to_inline,
  sync,
} from '../joplin/index.js';
import type { JoplinConfig, JoplinBoard } from '../joplin/types.js';

interface CommandMeta {
  description: string;
  usage: string;
  options: Array<{ flag: string; description: string }>;
  stdin?: string;
}

const commandMeta: Record<string, CommandMeta> = {
  parse: {
    description: 'Parse a kanban board from Markdown (stdin) into JSON.',
    usage: 'jkan parse < board.md',
    stdin: 'Kanban board Markdown',
    options: [],
  },
  serialize: {
    description: 'Serialize a JSON board back into Markdown (stdout).',
    usage: 'jkan serialize < board.json',
    stdin: 'JSON board object',
    options: [],
  },
  'is-kanban-board': {
    description: 'Check whether Markdown content (stdin) is a kanban board.',
    usage: 'jkan is-kanban-board < file.md',
    stdin: 'Markdown content',
    options: [],
  },
  'fetch-board': {
    description: 'Fetch a kanban board from Joplin by note ID.',
    usage: 'jkan fetch-board --id <noteId>',
    options: [
      { flag: '--id <noteId>', description: 'Note ID of the kanban board (required)' },
    ],
  },
  'save-board': {
    description: 'Replace a board\'s content in Joplin with the provided JSON board (stdin). Uses optimistic concurrency.',
    usage: 'jkan save-board --id <noteId> < board.json',
    stdin: 'JSON board object',
    options: [
      { flag: '--id <noteId>', description: 'Note ID of the kanban board (required)' },
    ],
  },
  'list-boards': {
    description: 'List all kanban boards found in Joplin.',
    usage: 'jkan list-boards',
    options: [],
  },
  'create-board': {
    description: 'Create a new kanban board note in a Joplin notebook.',
    usage: 'jkan create-board --notebook <id> --title <title> [--columns col1,col2]',
    options: [
      { flag: '--notebook <id>', description: 'Notebook ID to create the board in (required)' },
      { flag: '--title <title>', description: 'Title of the new board note (required)' },
      { flag: '--columns <names>', description: 'Comma-separated list of initial column titles (optional)' },
    ],
  },
  'list-columns': {
    description: 'List all columns in a board.',
    usage: 'jkan list-columns --board <id>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
    ],
  },
  'add-column': {
    description: 'Add a new column to a board.',
    usage: 'jkan add-column --board <id> --title <title> [--position <n>]',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--title <title>', description: 'Column title (required)' },
      { flag: '--position <n>', description: 'Insert position, 0-based (optional, default: end)' },
    ],
  },
  'remove-column': {
    description: 'Remove a column from a board. The column must be empty.',
    usage: 'jkan remove-column --board <id> --column <colId>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--column <colId>', description: 'Column ID, e.g. col0 (required)' },
    ],
  },
  'rename-column': {
    description: 'Rename a column.',
    usage: 'jkan rename-column --board <id> --column <colId> --title <title>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--column <colId>', description: 'Column ID, e.g. col0 (required)' },
      { flag: '--title <title>', description: 'New column title (required)' },
    ],
  },
  'move-column': {
    description: 'Move a column to a new position.',
    usage: 'jkan move-column --board <id> --column <colId> --position <n>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--column <colId>', description: 'Column ID, e.g. col0 (required)' },
      { flag: '--position <n>', description: 'Target position, 0-based (required)' },
    ],
  },
  'list-cards': {
    description: 'List all cards in a column.',
    usage: 'jkan list-cards --board <id> --column <colId>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--column <colId>', description: 'Column ID, e.g. col0 (required)' },
    ],
  },
  'find-cards': {
    description: 'Find cards whose title contains a search string (case-insensitive).',
    usage: 'jkan find-cards --board <id> --query <text>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--query <text>', description: 'Title substring to search for (required)' },
    ],
  },
  'add-card': {
    description: 'Add a new card to a column.',
    usage: 'jkan add-card --board <id> --column <colId> --title <title> [options]',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--column <colId>', description: 'Column ID, e.g. col0 (required)' },
      { flag: '--title <title>', description: 'Card title (required)' },
      { flag: '--body <text>', description: 'Card body content (optional)' },
      { flag: '--position <n>', description: 'Insert position, 0-based (optional, default: end)' },
    ],
  },
  'remove-card': {
    description: 'Remove a card from the board.',
    usage: 'jkan remove-card --board <id> --card <cardId>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--card <cardId>', description: 'Card ID, e.g. col0:card0 (required)' },
    ],
  },
  'move-card': {
    description: 'Move a single card to another column.',
    usage: 'jkan move-card --board <id> --card <cardId> --to-column <colId> [--position <n>]',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--card <cardId>', description: 'Card ID, e.g. col0:card0 (required)' },
      { flag: '--to-column <colId>', description: 'Destination column ID, e.g. col1 (required)' },
      { flag: '--position <n>', description: 'Insert position in destination, 0-based (optional, default: end)' },
    ],
  },
  'move-cards': {
    description: 'Move multiple cards to a column in one atomic operation. All card IDs are resolved before any mutations, avoiding index drift.',
    usage: 'jkan move-cards --board <id> --cards <id1,id2,...> --to-column <colId> [--position <n>]',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--cards <id1,id2,...>', description: 'Comma-separated card IDs to move (required)' },
      { flag: '--to-column <colId>', description: 'Destination column ID, e.g. col1 (required)' },
      { flag: '--position <n>', description: 'Insert position in destination, 0-based (optional, default: end)' },
    ],
  },
  'rename-card': {
    description: 'Rename a card.',
    usage: 'jkan rename-card --board <id> --card <cardId> --title <title>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--card <cardId>', description: 'Card ID, e.g. col0:card0 (required)' },
      { flag: '--title <title>', description: 'New card title (required)' },
    ],
  },
  'update-card-body': {
    description: 'Update the body content of a card.',
    usage: 'jkan update-card-body --board <id> --card <cardId> --body <text>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--card <cardId>', description: 'Card ID, e.g. col0:card0 (required)' },
      { flag: '--body <text>', description: 'New body content (required; use "" to clear)' },
    ],
  },
  'get-settings': {
    description: 'Get the board-level kanban settings.',
    usage: 'jkan get-settings --board <id>',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
    ],
  },
  'update-settings': {
    description: 'Merge key-value pairs (stdin JSON object) into the board settings.',
    usage: 'jkan update-settings --board <id> < settings.json',
    stdin: 'JSON object with settings key-value pairs',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
    ],
  },
  'convert-to-external': {
    description: 'Convert an inline card into an external Joplin note and replace the card body with a link.',
    usage: 'jkan convert-to-external --board <id> --card <cardId> [--notebook <notebookId>]',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--card <cardId>', description: 'Card ID, e.g. col0:card0 (required)' },
      { flag: '--notebook <id>', description: 'Notebook ID for the new note (optional, defaults to board\'s notebook)' },
    ],
  },
  'convert-to-inline': {
    description: 'Convert an externally-linked card back to inline by pulling in the note body.',
    usage: 'jkan convert-to-inline --board <id> --card <cardId> [--delete-note]',
    options: [
      { flag: '--board <id>', description: 'Board note ID (required)' },
      { flag: '--card <cardId>', description: 'Card ID, e.g. col0:card0 (required)' },
      { flag: '--delete-note', description: 'Also delete the external note after inlining (optional)' },
    ],
  },
  sync: {
    description: 'Run Joplin sync.',
    usage: 'jkan sync',
    options: [],
  },
  'help-all': {
    description: 'Show detailed help for all commands.',
    usage: 'jkan help-all',
    options: [],
  },
};

function formatCommandHelp(name: string): string {
  const meta = commandMeta[name];
  if (!meta) return `No help available for '${name}'.`;
  const lines: string[] = [];
  lines.push(`jkan ${name} — ${meta.description}`);
  lines.push('');
  lines.push(`Usage: ${meta.usage}`);
  if (meta.stdin) {
    lines.push(`Stdin: ${meta.stdin}`);
  }
  if (meta.options.length > 0) {
    lines.push('');
    lines.push('Options:');
    const maxLen = Math.max(...meta.options.map(o => o.flag.length));
    for (const opt of meta.options) {
      lines.push(`  ${opt.flag.padEnd(maxLen + 2)}${opt.description}`);
    }
  }
  lines.push('');
  lines.push('Output: JSON to stdout. Errors: JSON to stderr.');
  return lines.join('\n');
}

function formatAllCommandsHelp(): string {
  const lines: string[] = [];
  lines.push('jkan — Joplin Kanban SDK CLI');
  lines.push('');
  lines.push('Usage: jkan <command> [options]');
  lines.push('       jkan <command> --help');
  lines.push('');
  lines.push('All output is JSON. Errors are written to stderr as JSON.');
  lines.push('Set JOPLIN_API_TOKEN for commands that access the Joplin API.');
  lines.push('');

  const groups: Array<{ heading: string; names: string[] }> = [
    { heading: 'PARSING & SERIALIZATION', names: ['parse', 'serialize', 'is-kanban-board'] },
    { heading: 'BOARD', names: ['fetch-board', 'save-board', 'list-boards', 'create-board'] },
    { heading: 'COLUMNS', names: ['list-columns', 'add-column', 'remove-column', 'rename-column', 'move-column'] },
    { heading: 'CARDS', names: ['list-cards', 'find-cards', 'add-card', 'remove-card', 'move-card', 'move-cards', 'rename-card', 'update-card-body'] },
    { heading: 'SETTINGS', names: ['get-settings', 'update-settings'] },
    { heading: 'EXTERNAL NOTES', names: ['convert-to-external', 'convert-to-inline'] },
    { heading: 'MISC', names: ['sync', 'help-all'] },
  ];

  for (const group of groups) {
    lines.push(`${group.heading}`);
    for (const name of group.names) {
      const meta = commandMeta[name];
      if (!meta) continue;
      lines.push(`  ${name}`);
      lines.push(`    ${meta.description}`);
      lines.push(`    Usage: ${meta.usage}`);
      if (meta.stdin) lines.push(`    Stdin: ${meta.stdin}`);
      if (meta.options.length > 0) {
        lines.push('    Options:');
        const maxLen = Math.max(...meta.options.map(o => o.flag.length));
        for (const opt of meta.options) {
          lines.push(`      ${opt.flag.padEnd(maxLen + 2)}${opt.description}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

export function getCommandHelp(name: string): string {
  return formatCommandHelp(name);
}

export function getAllCommandsHelp(): string {
  return formatAllCommandsHelp();
}

function annotateBoard(jboard: JoplinBoard) {
  return {
    ...jboard,
    board: {
      ...jboard.board,
      columns: jboard.board.columns.map((col, ci) => ({
        ...col,
        id: `col${ci}`,
        cards: col.cards.map((card, cdi) => ({
          ...card,
          id: `col${ci}:card${cdi}`,
        })),
      })),
    },
  };
}

function getConfig(): Pick<JoplinConfig, 'baseUrl' | 'token'> {
  const token = process.env['JOPLIN_API_TOKEN'];
  if (!token) {
    throw new Error('JOPLIN_API_TOKEN environment variable is required');
  }
  return {
    baseUrl: process.env['JOPLIN_API_URL'] ?? DEFAULT_CONFIG.baseUrl!,
    token,
  };
}

function getClient(): JoplinClient {
  return new JoplinClient(getConfig());
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

interface CommandResult {
  data: unknown;
  raw?: boolean;
}

type CommandHandler = (args: string[]) => Promise<CommandResult> | Promise<never>;

const commands: Record<string, CommandHandler> = {
  async parse() {
    const md = await readStdin();
    const result = parse_board(md);
    return { data: result };
  },

  async serialize() {
    const json = await readStdin();
    const board = JSON.parse(json);
    const md = serialize_board(board);
    return { data: md, raw: true };
  },

  async 'is-kanban-board'() {
    const md = await readStdin();
    return { data: { result: is_kanban_board(md) } };
  },

  async 'fetch-board'(args) {
    const id = getFlag(args, '--id');
    if (!id) throw new Error('--id is required');
    const client = getClient();
    const jboard = await fetch_board(client, id);
    return { data: annotateBoard(jboard) };
  },

  async 'save-board'(args) {
    const id = getFlag(args, '--id');
    if (!id) throw new Error('--id is required');
    const json = await readStdin();
    const board = JSON.parse(json);
    const client = getClient();
    const jboard = await fetch_board(client, id);
    const result = await save_board(client, jboard, board);
    return { data: annotateBoard(result) };
  },

  async 'list-boards'() {
    const client = getClient();
    const boards = await list_boards(client);
    return { data: boards };
  },

  async 'create-board'(args) {
    const notebook = getFlag(args, '--notebook');
    const title = getFlag(args, '--title');
    if (!notebook || !title) throw new Error('--notebook and --title are required');
    const columnsStr = getFlag(args, '--columns');
    const columns = columnsStr ? columnsStr.split(',').map(s => s.trim()) : undefined;
    const client = getClient();
    const result = await create_board(client, notebook, title, columns);
    return { data: annotateBoard(result) };
  },

  async 'add-column'(args) {
    const boardId = getFlag(args, '--board');
    const title = getFlag(args, '--title');
    if (!boardId || !title) throw new Error('--board and --title are required');
    const posStr = getFlag(args, '--position');
    const position = posStr !== undefined ? parseInt(posStr, 10) : undefined;
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = add_column(jboard.board, title, position);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'remove-column'(args) {
    const boardId = getFlag(args, '--board');
    const column = getFlag(args, '--column');
    if (!boardId || !column) throw new Error('--board and --column are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = remove_column(jboard.board, column);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'rename-column'(args) {
    const boardId = getFlag(args, '--board');
    const column = getFlag(args, '--column');
    const title = getFlag(args, '--title');
    if (!boardId || !column || !title) throw new Error('--board, --column, and --title are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = rename_column(jboard.board, column, title);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'move-column'(args) {
    const boardId = getFlag(args, '--board');
    const column = getFlag(args, '--column');
    const posStr = getFlag(args, '--position');
    if (!boardId || !column || posStr === undefined) throw new Error('--board, --column, and --position are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = move_column(jboard.board, column, parseInt(posStr, 10));
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'add-card'(args) {
    const boardId = getFlag(args, '--board');
    const column = getFlag(args, '--column');
    const title = getFlag(args, '--title');
    if (!boardId || !column || !title) throw new Error('--board, --column, and --title are required');
    const body = getFlag(args, '--body');
    const posStr = getFlag(args, '--position');
    const position = posStr !== undefined ? parseInt(posStr, 10) : undefined;
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = add_card(jboard.board, column, title, body, position);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'remove-card'(args) {
    const boardId = getFlag(args, '--board');
    const card = getFlag(args, '--card');
    if (!boardId || !card) throw new Error('--board and --card are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = remove_card(jboard.board, card);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'move-card'(args) {
    const boardId = getFlag(args, '--board');
    const card = getFlag(args, '--card');
    const toColumn = getFlag(args, '--to-column');
    if (!boardId || !card || !toColumn) throw new Error('--board, --card, and --to-column are required');
    const posStr = getFlag(args, '--position');
    const position = posStr !== undefined ? parseInt(posStr, 10) : undefined;
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = move_card(jboard.board, card, toColumn, position);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'move-cards'(args) {
    const boardId = getFlag(args, '--board');
    const cardsStr = getFlag(args, '--cards');
    const toColumn = getFlag(args, '--to-column');
    if (!boardId || !cardsStr || !toColumn) throw new Error('--board, --cards, and --to-column are required');
    const cardIds = cardsStr.split(',').map(s => s.trim()).filter(Boolean);
    const posStr = getFlag(args, '--position');
    const position = posStr !== undefined ? parseInt(posStr, 10) : undefined;
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = move_cards(jboard.board, cardIds, toColumn, position);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'rename-card'(args) {
    const boardId = getFlag(args, '--board');
    const card = getFlag(args, '--card');
    const title = getFlag(args, '--title');
    if (!boardId || !card || !title) throw new Error('--board, --card, and --title are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = rename_card(jboard.board, card, title);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'update-card-body'(args) {
    const boardId = getFlag(args, '--board');
    const card = getFlag(args, '--card');
    const body = getFlag(args, '--body');
    if (!boardId || !card || body === undefined) throw new Error('--board, --card, and --body are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = update_card_body(jboard.board, card, body);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'find-cards'(args) {
    const boardId = getFlag(args, '--board');
    const query = getFlag(args, '--query');
    if (!boardId || !query) throw new Error('--board and --query are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const cards = find_cards(jboard.board, query);
    return { data: cards };
  },

  async 'list-cards'(args) {
    const boardId = getFlag(args, '--board');
    const column = getFlag(args, '--column');
    if (!boardId || !column) throw new Error('--board and --column are required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const cards = list_cards(jboard.board, column);
    return { data: cards };
  },

  async 'list-columns'(args) {
    const boardId = getFlag(args, '--board');
    if (!boardId) throw new Error('--board is required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const columns = list_columns(jboard.board);
    return { data: columns };
  },

  async 'get-settings'(args) {
    const boardId = getFlag(args, '--board');
    if (!boardId) throw new Error('--board is required');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    return { data: get_board_settings(jboard.board) };
  },

  async 'update-settings'(args) {
    const boardId = getFlag(args, '--board');
    if (!boardId) throw new Error('--board is required');
    const json = await readStdin();
    const updates = JSON.parse(json);
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const newBoard = update_board_settings(jboard.board, updates);
    const result = await save_board(client, jboard, newBoard);
    return { data: annotateBoard(result) };
  },

  async 'convert-to-external'(args) {
    const boardId = getFlag(args, '--board');
    const card = getFlag(args, '--card');
    if (!boardId || !card) throw new Error('--board and --card are required');
    const notebook = getFlag(args, '--notebook');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const result = await convert_to_external(client, jboard, card, notebook);
    await save_board(client, { ...jboard, board: result.board }, result.board);
    return { data: annotateBoard(result) };
  },

  async 'convert-to-inline'(args) {
    const boardId = getFlag(args, '--board');
    const card = getFlag(args, '--card');
    if (!boardId || !card) throw new Error('--board and --card are required');
    const deleteNote = hasFlag(args, '--delete-note');
    const client = getClient();
    const jboard = await fetch_board(client, boardId);
    const result = await convert_to_inline(client, jboard, card, deleteNote);
    await save_board(client, { ...jboard, board: result.board }, result.board);
    return { data: annotateBoard(result) };
  },

  async sync() {
    await sync();
    return { data: { success: true } };
  },

  async 'help-all'() {
    process.stdout.write(formatAllCommandsHelp() + '\n');
    process.exit(0);
  },
};

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export async function runCommand(command: string, args: string[]): Promise<void> {
  const handler = commands[command];
  if (!handler) {
    const available = Object.keys(commands).sort().join(', ');
    process.stderr.write(JSON.stringify({ error: `Unknown command: ${command}`, code: 'UNKNOWN_COMMAND', available }) + '\n');
    process.exitCode = 1;
    return;
  }

  if (args.includes('-h') || args.includes('--help')) {
    process.stdout.write(formatCommandHelp(command) + '\n');
    process.exit(0);
  }

  try {
    const result = await handler(args);
    if (result.raw && typeof result.data === 'string') {
      process.stdout.write(result.data);
    } else {
      process.stdout.write(JSON.stringify(result.data, null, 2) + '\n');
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const code = 'code' in error ? (error as { code: string }).code : 'ERROR';
    process.stderr.write(JSON.stringify({ error: error.message, code }) + '\n');
    process.exitCode = 1;
  }
}

export function listCommands(): string[] {
  return Object.keys(commands).sort();
}
