import { describe, it, expect, vi } from 'vitest';
import { fetch_board, save_board, list_boards, create_board } from '../../src/joplin/board-io.js';
import { ConcurrentModificationError } from '../../src/joplin/errors.js';
import { serialize_board } from '../../src/core/board-ops.js';
import type { Board } from '../../src/core/types.js';
import type { JoplinBoard } from '../../src/joplin/types.js';

const BOARD_MD = '# Todo\n\n## Task 1\n\n```kanban-settings\n# Do not remove this block\n```\n';

function mockClient(overrides?: Record<string, (...args: unknown[]) => unknown>) {
  return {
    getNote: vi.fn().mockResolvedValue({
      id: 'note1',
      title: 'My Board',
      body: BOARD_MD,
      parent_id: 'folder1',
      updated_time: 1000,
    }),
    updateNote: vi.fn().mockResolvedValue(undefined),
    createNote: vi.fn().mockResolvedValue({
      id: 'new1',
      title: 'New Board',
      body: '',
      parent_id: 'folder1',
      updated_time: 2000,
    }),
    searchNotes: vi.fn().mockResolvedValue([
      { id: 'note1', title: 'Board 1', body: BOARD_MD, parent_id: 'folder1', updated_time: 1000 },
      { id: 'note2', title: 'Not a board', body: 'Regular note', parent_id: 'folder1', updated_time: 1000 },
    ]),
    ...overrides,
  } as any;
}

describe('board-io', () => {
  describe('fetch_board', () => {
    it('fetches and parses a board', async () => {
      const client = mockClient();
      const jboard = await fetch_board(client, 'note1');
      expect(jboard.noteId).toBe('note1');
      expect(jboard.noteTitle).toBe('My Board');
      expect(jboard.board.columns).toHaveLength(1);
      expect(jboard.board.columns[0].title).toBe('Todo');
      expect(jboard.board.columns[0].cards[0].title).toBe('Task 1');
    });
  });

  describe('save_board', () => {
    it('serializes and saves a board', async () => {
      const client = mockClient();
      const jboard: JoplinBoard = {
        board: { columns: [{ title: 'Todo', cards: [{ title: 'Task 1', body: '', cardSettings: null }], stackSettings: null }], boardSettings: { raw: ['# Do not remove this block'], entries: {} } },
        noteId: 'note1',
        noteTitle: 'My Board',
        notebookId: 'folder1',
        updatedTime: 1000,
      };

      const newBoard: Board = {
        ...jboard.board,
        columns: [...jboard.board.columns, { title: 'Done', cards: [], stackSettings: null }],
      };

      const result = await save_board(client, jboard, newBoard);
      expect(client.updateNote).toHaveBeenCalledWith('note1', { body: serialize_board(newBoard) });
      expect(result.board).toBe(newBoard);
    });

    it('throws ConcurrentModificationError when updated_time changed', async () => {
      const client = mockClient({
        getNote: vi.fn().mockResolvedValue({
          id: 'note1',
          title: 'My Board',
          body: BOARD_MD,
          parent_id: 'folder1',
          updated_time: 2000,
        }),
      });

      const jboard: JoplinBoard = {
        board: { columns: [], boardSettings: { raw: [], entries: {} } },
        noteId: 'note1',
        noteTitle: 'My Board',
        notebookId: 'folder1',
        updatedTime: 1000,
      };

      await expect(save_board(client, jboard, jboard.board))
        .rejects.toThrow(ConcurrentModificationError);
    });
  });

  describe('list_boards', () => {
    it('filters to only kanban boards', async () => {
      const client = mockClient();
      const boards = await list_boards(client);
      expect(boards).toHaveLength(1);
      expect(boards[0].noteId).toBe('note1');
      expect(boards[0].title).toBe('Board 1');
      expect(boards[0].columnCount).toBe(1);
      expect(boards[0].cardCount).toBe(1);
    });
  });

  describe('create_board', () => {
    it('creates a new board with columns', async () => {
      const client = mockClient();
      const jboard = await create_board(client, 'folder1', 'New Board', ['Todo', 'Done']);
      expect(client.createNote).toHaveBeenCalled();
      expect(jboard.board.columns).toHaveLength(2);
      expect(jboard.board.columns[0].title).toBe('Todo');
      expect(jboard.board.columns[1].title).toBe('Done');
    });

    it('creates empty board without columns', async () => {
      const client = mockClient();
      const jboard = await create_board(client, 'folder1', 'Empty Board');
      expect(jboard.board.columns).toHaveLength(0);
    });
  });
});
