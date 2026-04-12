import { describe, it, expect, vi } from 'vitest';
import { set_due_date, mark_complete, get_note_tags, get_note_metadata } from '../../src/joplin/note-metadata.js';
import { InvalidContentError } from '../../src/core/errors.js';
import type { Card } from '../../src/core/types.js';

const LINKED_CARD: Card = {
  title: '[Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)',
  body: '',
  cardSettings: null,
};

const INLINE_CARD: Card = {
  title: 'Plain Card',
  body: '',
  cardSettings: null,
};

function mockClient() {
  return {
    updateNote: vi.fn().mockResolvedValue(undefined),
    getNoteTags: vi.fn().mockResolvedValue([
      { id: 'tag1', title: 'urgent' },
      { id: 'tag2', title: 'work' },
    ]),
    getNote: vi.fn().mockResolvedValue({
      id: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      title: 'Task',
      created_time: 1000,
      updated_time: 2000,
      is_todo: 1,
      todo_due: 3000,
      todo_completed: 0,
    }),
  } as any;
}

describe('note metadata', () => {
  describe('set_due_date', () => {
    it('sets due date on linked card', async () => {
      const client = mockClient();
      const date = new Date('2026-01-15T00:00:00Z');
      await set_due_date(client, LINKED_CARD, date);

      expect(client.updateNote).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        { is_todo: 1, todo_due: date.getTime() }
      );
    });

    it('throws for inline card', async () => {
      const client = mockClient();
      await expect(set_due_date(client, INLINE_CARD, new Date()))
        .rejects.toThrow(InvalidContentError);
    });
  });

  describe('mark_complete', () => {
    it('marks linked card as complete', async () => {
      const client = mockClient();
      await mark_complete(client, LINKED_CARD);

      expect(client.updateNote).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        expect.objectContaining({ is_todo: 1, todo_completed: expect.any(Number) })
      );
    });
  });

  describe('get_note_tags', () => {
    it('returns tags for linked card', async () => {
      const client = mockClient();
      const tags = await get_note_tags(client, LINKED_CARD);
      expect(tags).toHaveLength(2);
      expect(tags[0].title).toBe('urgent');
    });
  });

  describe('get_note_metadata', () => {
    it('returns metadata for linked card', async () => {
      const client = mockClient();
      const meta = await get_note_metadata(client, LINKED_CARD);
      expect(meta.noteId).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
      expect(meta.isTodo).toBe(true);
      expect(meta.todoDue).toBe(3000);
      expect(meta.todoCompleted).toBeNull();
    });
  });
});
