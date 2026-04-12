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

type CommandHandler = (args: string[]) => Promise<CommandResult>;

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
    const jboard = await fetch_board(client, id, { syncBeforeRead: false });
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
