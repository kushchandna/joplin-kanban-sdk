import { describe, it, expect, beforeAll } from 'vitest';
import { JoplinClient } from '../../src/joplin/joplin-client.js';
import { fetch_board, save_board, list_boards, create_board } from '../../src/joplin/board-io.js';
import { convert_to_external, convert_to_inline } from '../../src/joplin/external-notes.js';
import { get_note_metadata } from '../../src/joplin/note-metadata.js';
import { add_column, add_card, move_card, remove_card, rename_column } from '../../src/core/index.js';

const ENABLED = process.env['JOPLIN_INTEGRATION_TEST'] === '1';
const TOKEN = process.env['JOPLIN_API_TOKEN'] ?? '';
const BASE_URL = process.env['JOPLIN_API_URL'] ?? 'http://localhost:41184';

describe.skipIf(!ENABLED)('integration tests (requires running Joplin CLI)', () => {
  let client: JoplinClient;
  let notebookId: string;

  beforeAll(async () => {
    client = new JoplinClient({ baseUrl: BASE_URL, token: TOKEN });

    const folders = await client.listFolders();
    if (folders.length === 0) {
      throw new Error(
        'No notebooks found. Create at least one notebook in Joplin first:\n' +
        '  joplin mkbook "Test Notebook"'
      );
    }
    notebookId = folders[0].id;
  });

  it('creates a board, manipulates it, and reads it back', async () => {
    const jboard = await create_board(client, notebookId, `Integration Test ${Date.now()}`, ['Todo', 'In Progress', 'Done']);
    expect(jboard.board.columns).toHaveLength(3);

    let board = add_card(jboard.board, 'col0', 'First task', 'Some details');
    board = add_card(board, 'col0', 'Second task');

    const saved = await save_board(client, jboard, board);
    expect(saved.board.columns[0].cards).toHaveLength(2);

    const fetched = await fetch_board(client, jboard.noteId);
    expect(fetched.board.columns[0].cards).toHaveLength(2);
    expect(fetched.board.columns[0].cards[0].title).toBe('First task');
    expect(fetched.board.columns[0].cards[0].body).toBe('Some details');

    let modified = move_card(fetched.board, 'col0:card0', 'col1');
    modified = rename_column(modified, 'col2', 'Completed');

    const saved2 = await save_board(client, fetched, modified);
    expect(saved2.board.columns[0].cards).toHaveLength(1);
    expect(saved2.board.columns[1].cards).toHaveLength(1);
    expect(saved2.board.columns[1].cards[0].title).toBe('First task');
    expect(saved2.board.columns[2].title).toBe('Completed');

    await client.deleteNote(jboard.noteId);
  });

  it('converts inline card to external and back', async () => {
    const jboard = await create_board(client, notebookId, `External Note Test ${Date.now()}`, ['Tasks']);
    let board = add_card(jboard.board, 'col0', 'Linked task', 'This will become an external note');
    const saved = await save_board(client, jboard, board);

    const withExternal = await convert_to_external(client, saved, 'col0:card0');
    expect(withExternal.board.columns[0].cards[0].title).toMatch(/^\[Linked task\]\(:\/[a-f0-9]{32}\)$/);
    expect(withExternal.board.columns[0].cards[0].body).toBe('');

    const savedExternal = await save_board(client, saved, withExternal.board);

    const withInline = await convert_to_inline(client, savedExternal, 'col0:card0', true);
    expect(withInline.board.columns[0].cards[0].title).toBe('Linked task');
    expect(withInline.board.columns[0].cards[0].body).toBe('This will become an external note');

    await client.deleteNote(jboard.noteId);
  });

  it('lists boards', async () => {
    const jboard = await create_board(client, notebookId, `List Test ${Date.now()}`, ['Col']);

    const boards = await list_boards(client);
    expect(boards.some(b => b.noteId === jboard.noteId)).toBe(true);

    await client.deleteNote(jboard.noteId);
  });
});
