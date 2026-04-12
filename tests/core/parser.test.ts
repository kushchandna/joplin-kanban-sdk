import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse_board } from '../../src/core/board-ops.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

describe('parser', () => {
  describe('example board from YesYouKan test suite', () => {
    const md = readFixture('example-board.md');
    const { board, warnings } = parse_board(md);

    it('parses without warnings', () => {
      expect(warnings).toEqual([]);
    });

    it('parses 4 columns', () => {
      expect(board.columns).toHaveLength(4);
      expect(board.columns.map(c => c.title)).toEqual([
        'Draft', 'To review', 'To publish', 'Completed',
      ]);
    });

    it('parses cards in Draft column', () => {
      const draft = board.columns[0];
      expect(draft.cards).toHaveLength(2);
      expect(draft.cards[0].title).toBe('Post 1');
      expect(draft.cards[0].body).toBe('Content 1');
      expect(draft.cards[1].title).toBe('Post 2');
      expect(draft.cards[1].body).toBe('Content 2');
    });

    it('parses card with card-settings', () => {
      const review = board.columns[1];
      expect(review.cards).toHaveLength(1);
      expect(review.cards[0].title).toBe('Post 3');
      expect(review.cards[0].body).toBe('Content 3');
      expect(review.cards[0].cardSettings).not.toBeNull();
      expect(review.cards[0].cardSettings!.entries['backgroundColor']).toBe('#ff0000');
    });

    it('parses column with stack-settings', () => {
      const publish = board.columns[2];
      expect(publish.stackSettings).not.toBeNull();
      expect(publish.stackSettings!.entries['backgroundColor']).toBe('#00ff00');
    });

    it('parses card with multi-line body including blank lines', () => {
      const publish = board.columns[2];
      expect(publish.cards).toHaveLength(1);
      expect(publish.cards[0].title).toBe('Post 4');
      expect(publish.cards[0].body).toBe('Content 4\n\n\nSome empty lines above');
    });

    it('parses empty column (Completed has no cards)', () => {
      const completed = board.columns[3];
      expect(completed.cards).toHaveLength(0);
    });

    it('parses board settings', () => {
      expect(board.boardSettings.entries['confirmKey']).toBe('Shift+Enter');
      expect(board.boardSettings.entries['stackWidth']).toBe('100');
      expect(board.boardSettings.entries['filters']).toBe('{"tagIds":["1"]}');
    });

    it('preserves comments in board settings raw lines', () => {
      expect(board.boardSettings.raw).toContain('# Do not remove this block');
    });
  });

  describe('empty board', () => {
    const md = readFixture('empty-board.md');
    const { board, warnings } = parse_board(md);

    it('parses without warnings', () => {
      expect(warnings).toEqual([]);
    });

    it('has no columns', () => {
      expect(board.columns).toHaveLength(0);
    });

    it('has board settings', () => {
      expect(board.boardSettings.raw).toContain('# Do not remove this block');
    });
  });

  describe('linked cards board', () => {
    const md = readFixture('linked-cards-board.md');
    const { board } = parse_board(md);

    it('preserves linked card title syntax', () => {
      expect(board.columns[0].cards[0].title).toBe(
        '[Important Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)'
      );
    });

    it('preserves inline card alongside linked cards', () => {
      expect(board.columns[0].cards[1].title).toBe('Regular Card');
      expect(board.columns[0].cards[1].body).toBe('Some inline content');
    });
  });

  describe('multiline body board', () => {
    const md = readFixture('multiline-body-board.md');
    const { board } = parse_board(md);

    it('preserves ### headings as body content', () => {
      const body = board.columns[0].cards[0].body;
      expect(body).toContain('### A Subheading In Body');
      expect(body).toContain('#### Even Deeper');
    });

    it('preserves blank lines within body', () => {
      const body = board.columns[0].cards[0].body;
      expect(body).toContain('Line one of body\n\nLine two after blank');
    });
  });

  describe('no settings board (malformed)', () => {
    const md = readFixture('no-settings-board.md');
    const { board, warnings } = parse_board(md);

    it('produces a warning about missing kanban-settings', () => {
      expect(warnings.some(w => w.includes('kanban-settings'))).toBe(true);
    });

    it('still parses columns and cards', () => {
      expect(board.columns).toHaveLength(2);
      expect(board.columns[0].cards[0].title).toBe('Card Alpha');
    });
  });

  describe('card before any column', () => {
    const md = '## Orphan Card\n\nSome body\n\n# Real Column\n\n## Real Card\n\n```kanban-settings\n```\n';
    const { board, warnings } = parse_board(md);

    it('creates implicit column with warning', () => {
      expect(warnings.some(w => w.includes('implicit column'))).toBe(true);
      expect(board.columns).toHaveLength(2);
      expect(board.columns[0].title).toBe('');
      expect(board.columns[0].cards[0].title).toBe('Orphan Card');
    });
  });

  describe('card with no body', () => {
    const md = '# Col\n\n## Empty Card\n\n## Another Empty\n\n```kanban-settings\n```\n';
    const { board } = parse_board(md);

    it('sets body to empty string', () => {
      expect(board.columns[0].cards[0].body).toBe('');
      expect(board.columns[0].cards[1].body).toBe('');
    });
  });
});
