import { describe, it, expect, vi } from 'vitest';
import { convert_to_external, convert_to_inline, fetch_linked_note, update_linked_note } from '../../src/joplin/external-notes.js';
import { parse_board } from '../../src/core/board-ops.js';
import { InvalidContentError } from '../../src/core/errors.js';
import { NoteNotFoundError } from '../../src/joplin/errors.js';
import type { JoplinBoard } from '../../src/joplin/types.js';

const BOARD_MD = '# Todo\n\n## My Task\n\nTask details here\n\n## [Linked Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)\n\n```kanban-settings\n# Do not remove this block\n```\n';

function makeJboard(): JoplinBoard {
  const { board } = parse_board(BOARD_MD);
  return {
    board,
    noteId: 'board1',
    noteTitle: 'My Board',
    notebookId: 'folder1',
    updatedTime: 1000,
  };
}

function mockClient(overrides?: Record<string, unknown>) {
  return {
    createNote: vi.fn().mockResolvedValue({
      id: 'newnote123456789012345678901234',
      title: 'My Task',
      body: 'Task details here',
      parent_id: 'folder1',
      updated_time: 2000,
    }),
    getNote: vi.fn().mockResolvedValue({
      id: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      title: 'Linked Task',
      body: 'External note content',
      parent_id: 'folder1',
    }),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    updateNote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('external notes', () => {
  describe('convert_to_external', () => {
    it('converts inline card to linked card', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      const result = await convert_to_external(client, jboard, 'col0:card0');

      expect(client.createNote).toHaveBeenCalledWith({
        title: 'My Task',
        body: 'Task details here',
        parent_id: 'folder1',
      });

      const card = result.board.columns[0].cards[0];
      expect(card.title).toContain('[My Task]');
      expect(card.title).toContain('newnote123456789012345678901234');
      expect(card.body).toBe('');
    });

    it('uses custom notebook when specified', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      await convert_to_external(client, jboard, 'col0:card0', 'other-folder');

      expect(client.createNote).toHaveBeenCalledWith(
        expect.objectContaining({ parent_id: 'other-folder' })
      );
    });

    it('throws when card is already linked', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      await expect(convert_to_external(client, jboard, 'col0:card1'))
        .rejects.toThrow(InvalidContentError);
    });
  });

  describe('convert_to_inline', () => {
    it('converts linked card to inline', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      const result = await convert_to_inline(client, jboard, 'col0:card1');

      expect(result.board.columns[0].cards[1].title).toBe('Linked Task');
      expect(result.board.columns[0].cards[1].body).toBe('External note content');
    });

    it('deletes note when requested', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      await convert_to_inline(client, jboard, 'col0:card1', true);

      expect(client.deleteNote).toHaveBeenCalledWith('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
    });

    it('does not delete note by default', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      await convert_to_inline(client, jboard, 'col0:card1');

      expect(client.deleteNote).not.toHaveBeenCalled();
    });

    it('throws when card is not linked', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      await expect(convert_to_inline(client, jboard, 'col0:card0'))
        .rejects.toThrow(InvalidContentError);
    });
  });

  describe('fetch_linked_note', () => {
    it('fetches linked note content', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      const card = jboard.board.columns[0].cards[1];
      const note = await fetch_linked_note(client, card);

      expect(note.noteId).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
      expect(note.body).toBe('External note content');
    });

    it('throws when card is not linked', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      const card = jboard.board.columns[0].cards[0];
      await expect(fetch_linked_note(client, card))
        .rejects.toThrow(InvalidContentError);
    });

    it('propagates NoteNotFoundError for deleted notes', async () => {
      const client = mockClient({
        getNote: vi.fn().mockRejectedValue(new NoteNotFoundError('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6')),
      });
      const jboard = makeJboard();
      const card = jboard.board.columns[0].cards[1];
      await expect(fetch_linked_note(client, card))
        .rejects.toThrow(NoteNotFoundError);
    });
  });

  describe('update_linked_note', () => {
    it('updates linked note body', async () => {
      const client = mockClient();
      const jboard = makeJboard();
      const card = jboard.board.columns[0].cards[1];
      await update_linked_note(client, card, 'Updated content');

      expect(client.updateNote).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        { body: 'Updated content' }
      );
    });
  });
});
