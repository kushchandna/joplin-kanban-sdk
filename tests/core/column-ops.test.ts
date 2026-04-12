import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse_board } from '../../src/core/board-ops.js';
import { add_column, remove_column, rename_column, move_column, get_column, list_columns } from '../../src/core/column-ops.js';
import { ColumnNotFoundError, ColumnNotEmptyError, InvalidPositionError } from '../../src/core/errors.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');
const exampleBoard = parse_board(readFileSync(join(FIXTURES, 'example-board.md'), 'utf-8')).board;

describe('column operations', () => {
  describe('add_column', () => {
    it('adds at end by default', () => {
      const board = add_column(exampleBoard, 'New Column');
      expect(board.columns).toHaveLength(5);
      expect(board.columns[4].title).toBe('New Column');
      expect(board.columns[4].cards).toEqual([]);
    });

    it('adds at specific position', () => {
      const board = add_column(exampleBoard, 'Inserted', 1);
      expect(board.columns).toHaveLength(5);
      expect(board.columns[1].title).toBe('Inserted');
      expect(board.columns[2].title).toBe('To review');
    });

    it('adds at position 0', () => {
      const board = add_column(exampleBoard, 'First', 0);
      expect(board.columns[0].title).toBe('First');
      expect(board.columns[1].title).toBe('Draft');
    });

    it('throws on invalid position', () => {
      expect(() => add_column(exampleBoard, 'Bad', -1)).toThrow(InvalidPositionError);
      expect(() => add_column(exampleBoard, 'Bad', 10)).toThrow(InvalidPositionError);
    });

    it('does not mutate original board', () => {
      const original = exampleBoard.columns.length;
      add_column(exampleBoard, 'New');
      expect(exampleBoard.columns).toHaveLength(original);
    });
  });

  describe('remove_column', () => {
    it('removes empty column', () => {
      const board = remove_column(exampleBoard, 'col3');
      expect(board.columns).toHaveLength(3);
      expect(board.columns.map(c => c.title)).not.toContain('Completed');
    });

    it('throws when column has cards', () => {
      expect(() => remove_column(exampleBoard, 'col0')).toThrow(ColumnNotEmptyError);
    });

    it('throws on invalid column ID', () => {
      expect(() => remove_column(exampleBoard, 'col99')).toThrow(ColumnNotFoundError);
      expect(() => remove_column(exampleBoard, 'invalid')).toThrow(ColumnNotFoundError);
    });
  });

  describe('rename_column', () => {
    it('renames a column', () => {
      const board = rename_column(exampleBoard, 'col0', 'Drafts');
      expect(board.columns[0].title).toBe('Drafts');
    });

    it('preserves cards and settings', () => {
      const board = rename_column(exampleBoard, 'col2', 'Publishing');
      expect(board.columns[2].stackSettings).not.toBeNull();
      expect(board.columns[2].cards).toHaveLength(1);
    });
  });

  describe('move_column', () => {
    it('moves column to new position', () => {
      const board = move_column(exampleBoard, 'col0', 2);
      expect(board.columns[0].title).toBe('To review');
      expect(board.columns[2].title).toBe('Draft');
    });

    it('returns same board when position unchanged', () => {
      const board = move_column(exampleBoard, 'col1', 1);
      expect(board).toBe(exampleBoard);
    });

    it('throws on invalid position', () => {
      expect(() => move_column(exampleBoard, 'col0', -1)).toThrow(InvalidPositionError);
      expect(() => move_column(exampleBoard, 'col0', 10)).toThrow(InvalidPositionError);
    });
  });

  describe('get_column', () => {
    it('returns column by ID', () => {
      const col = get_column(exampleBoard, 'col1');
      expect(col.title).toBe('To review');
    });

    it('throws on invalid ID', () => {
      expect(() => get_column(exampleBoard, 'col99')).toThrow(ColumnNotFoundError);
    });
  });

  describe('list_columns', () => {
    it('returns all columns', () => {
      const cols = list_columns(exampleBoard);
      expect(cols).toHaveLength(4);
      expect(cols.map(c => c.title)).toEqual(['Draft', 'To review', 'To publish', 'Completed']);
    });
  });
});
