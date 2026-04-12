import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse_board } from '../../src/core/board-ops.js';
import { get_board_settings, update_board_settings } from '../../src/core/settings-ops.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');
const exampleBoard = parse_board(readFileSync(join(FIXTURES, 'example-board.md'), 'utf-8')).board;

describe('settings operations', () => {
  describe('get_board_settings', () => {
    it('returns board settings entries', () => {
      const settings = get_board_settings(exampleBoard);
      expect(settings.entries['confirmKey']).toBe('Shift+Enter');
      expect(settings.entries['stackWidth']).toBe('100');
    });

    it('includes raw lines', () => {
      const settings = get_board_settings(exampleBoard);
      expect(settings.raw).toContain('# Do not remove this block');
    });
  });

  describe('update_board_settings', () => {
    it('updates existing key', () => {
      const board = update_board_settings(exampleBoard, { stackWidth: '200' });
      expect(board.boardSettings.entries['stackWidth']).toBe('200');
    });

    it('adds new key', () => {
      const board = update_board_settings(exampleBoard, { newKey: 'newValue' });
      expect(board.boardSettings.entries['newKey']).toBe('newValue');
      expect(board.boardSettings.raw).toContain('newKey: newValue');
    });

    it('preserves comments in raw lines', () => {
      const board = update_board_settings(exampleBoard, { stackWidth: '300' });
      expect(board.boardSettings.raw).toContain('# Do not remove this block');
    });

    it('preserves other keys', () => {
      const board = update_board_settings(exampleBoard, { stackWidth: '300' });
      expect(board.boardSettings.entries['confirmKey']).toBe('Shift+Enter');
    });

    it('does not mutate original', () => {
      update_board_settings(exampleBoard, { stackWidth: '999' });
      expect(exampleBoard.boardSettings.entries['stackWidth']).toBe('100');
    });
  });
});
