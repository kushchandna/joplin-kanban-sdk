import { describe, it, expect } from 'vitest';
import { serialize_board } from '../../src/core/board-ops.js';
import type { Board } from '../../src/core/types.js';

describe('serializer', () => {
  it('serializes a simple board', () => {
    const board: Board = {
      columns: [
        {
          title: 'Todo',
          cards: [
            { title: 'Task 1', body: 'Do something', cardSettings: null },
            { title: 'Task 2', body: '', cardSettings: null },
          ],
          stackSettings: null,
        },
      ],
      boardSettings: {
        raw: ['# Do not remove this block'],
        entries: {},
      },
    };

    const md = serialize_board(board);
    expect(md).toBe(
      '# Todo\n\n' +
      '## Task 1\n\n' +
      'Do something\n\n' +
      '## Task 2\n\n' +
      '```kanban-settings\n' +
      '# Do not remove this block\n' +
      '```\n'
    );
  });

  it('serializes stack-settings before cards', () => {
    const board: Board = {
      columns: [
        {
          title: 'Urgent',
          cards: [
            { title: 'Fix bug', body: '', cardSettings: null },
          ],
          stackSettings: {
            raw: ['backgroundColor: #ff0000'],
            entries: { backgroundColor: '#ff0000' },
          },
        },
      ],
      boardSettings: { raw: [], entries: {} },
    };

    const md = serialize_board(board);
    expect(md).toContain('# Urgent\n\n```stack-settings\n');
    expect(md.indexOf('stack-settings')).toBeLessThan(md.indexOf('## Fix bug'));
  });

  it('serializes card-settings after card body', () => {
    const board: Board = {
      columns: [
        {
          title: 'Col',
          cards: [
            {
              title: 'Card',
              body: 'Body text',
              cardSettings: {
                raw: ['backgroundColor: #00ff00'],
                entries: { backgroundColor: '#00ff00' },
              },
            },
          ],
          stackSettings: null,
        },
      ],
      boardSettings: { raw: [], entries: {} },
    };

    const md = serialize_board(board);
    expect(md).toContain('Body text\n\n```card-settings\n');
  });

  it('places kanban-settings at the end', () => {
    const board: Board = {
      columns: [
        { title: 'A', cards: [], stackSettings: null },
      ],
      boardSettings: {
        raw: ['stackWidth: 200'],
        entries: { stackWidth: '200' },
      },
    };

    const md = serialize_board(board);
    expect(md.trimEnd().endsWith('```')).toBe(true);
    expect(md).toContain('```kanban-settings\nstackWidth: 200\n```');
  });
});
