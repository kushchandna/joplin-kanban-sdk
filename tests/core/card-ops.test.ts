import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse_board } from '../../src/core/board-ops.js';
import { add_card, remove_card, move_card, move_cards, rename_card, update_card_body, reorder_card, get_card, find_cards, list_cards } from '../../src/core/card-ops.js';
import { CardNotFoundError, InvalidPositionError, InvalidContentError } from '../../src/core/errors.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');
const exampleBoard = parse_board(readFileSync(join(FIXTURES, 'example-board.md'), 'utf-8')).board;

describe('card operations', () => {
  describe('add_card', () => {
    it('adds to end of column by default', () => {
      const board = add_card(exampleBoard, 'col0', 'New Card');
      expect(board.columns[0].cards).toHaveLength(3);
      expect(board.columns[0].cards[2].title).toBe('New Card');
      expect(board.columns[0].cards[2].body).toBe('');
    });

    it('adds with body', () => {
      const board = add_card(exampleBoard, 'col0', 'With Body', 'Some content');
      expect(board.columns[0].cards[2].body).toBe('Some content');
    });

    it('adds at specific position', () => {
      const board = add_card(exampleBoard, 'col0', 'Inserted', undefined, 0);
      expect(board.columns[0].cards[0].title).toBe('Inserted');
      expect(board.columns[0].cards[1].title).toBe('Post 1');
    });

    it('adds to empty column', () => {
      const board = add_card(exampleBoard, 'col3', 'First Card');
      expect(board.columns[3].cards).toHaveLength(1);
    });

    it('rejects body with # at line start', () => {
      expect(() => add_card(exampleBoard, 'col0', 'Bad', '# Heading')).toThrow(InvalidContentError);
    });

    it('rejects body with ## at line start', () => {
      expect(() => add_card(exampleBoard, 'col0', 'Bad', '## Heading')).toThrow(InvalidContentError);
    });

    it('allows ### in body', () => {
      const board = add_card(exampleBoard, 'col0', 'OK', '### Subheading');
      expect(board.columns[0].cards[2].body).toBe('### Subheading');
    });

    it('rejects empty title', () => {
      expect(() => add_card(exampleBoard, 'col0', '')).toThrow(InvalidContentError);
    });

    it('does not mutate original', () => {
      const origLen = exampleBoard.columns[0].cards.length;
      add_card(exampleBoard, 'col0', 'New');
      expect(exampleBoard.columns[0].cards).toHaveLength(origLen);
    });
  });

  describe('remove_card', () => {
    it('removes a card', () => {
      const board = remove_card(exampleBoard, 'col0:card0');
      expect(board.columns[0].cards).toHaveLength(1);
      expect(board.columns[0].cards[0].title).toBe('Post 2');
    });

    it('throws on invalid card ID', () => {
      expect(() => remove_card(exampleBoard, 'col0:card99')).toThrow(CardNotFoundError);
      expect(() => remove_card(exampleBoard, 'bad')).toThrow(CardNotFoundError);
    });
  });

  describe('move_card', () => {
    it('moves card between columns', () => {
      const board = move_card(exampleBoard, 'col0:card0', 'col3');
      expect(board.columns[0].cards).toHaveLength(1);
      expect(board.columns[3].cards).toHaveLength(1);
      expect(board.columns[3].cards[0].title).toBe('Post 1');
    });

    it('moves card to specific position', () => {
      const board = move_card(exampleBoard, 'col1:card0', 'col0', 0);
      expect(board.columns[0].cards[0].title).toBe('Post 3');
      expect(board.columns[0].cards).toHaveLength(3);
    });

    it('moves card within same column', () => {
      const board = move_card(exampleBoard, 'col0:card0', 'col0', 1);
      expect(board.columns[0].cards[0].title).toBe('Post 2');
      expect(board.columns[0].cards[1].title).toBe('Post 1');
    });
  });

  describe('move_cards', () => {
    it('moves multiple cards from one column to another', () => {
      const board = move_cards(exampleBoard, ['col0:card0', 'col0:card1'], 'col3');
      expect(board.columns[0].cards).toHaveLength(0);
      expect(board.columns[3].cards).toHaveLength(2);
      expect(board.columns[3].cards[0].title).toBe('Post 1');
      expect(board.columns[3].cards[1].title).toBe('Post 2');
    });

    it('moves cards from multiple source columns to one destination', () => {
      const board = move_cards(exampleBoard, ['col0:card0', 'col1:card0'], 'col3');
      expect(board.columns[0].cards).toHaveLength(1);
      expect(board.columns[1].cards).toHaveLength(0);
      expect(board.columns[3].cards).toHaveLength(2);
      expect(board.columns[3].cards[0].title).toBe('Post 1');
      expect(board.columns[3].cards[1].title).toBe('Post 3');
    });

    it('inserts cards at a specific position', () => {
      // col1 has Post 3, col2 has Post 4; move col0 cards to col1 at position 0
      const board = move_cards(exampleBoard, ['col0:card0', 'col0:card1'], 'col1', 0);
      expect(board.columns[1].cards[0].title).toBe('Post 1');
      expect(board.columns[1].cards[1].title).toBe('Post 2');
      expect(board.columns[1].cards[2].title).toBe('Post 3');
    });

    it('reorders a subset of cards within the same column', () => {
      // Move col0:card1 (Post 2) to col0 at position 0, effectively putting it before Post 1
      const board = move_cards(exampleBoard, ['col0:card1'], 'col0', 0);
      expect(board.columns[0].cards[0].title).toBe('Post 2');
      expect(board.columns[0].cards[1].title).toBe('Post 1');
    });

    it('returns the same board when given an empty array', () => {
      const board = move_cards(exampleBoard, [], 'col3');
      expect(board).toBe(exampleBoard);
    });

    it('throws on duplicate card IDs', () => {
      expect(() => move_cards(exampleBoard, ['col0:card0', 'col0:card0'], 'col3')).toThrow(CardNotFoundError);
    });

    it('throws on invalid card ID', () => {
      expect(() => move_cards(exampleBoard, ['col0:card99'], 'col3')).toThrow(CardNotFoundError);
      expect(() => move_cards(exampleBoard, ['bad'], 'col3')).toThrow(CardNotFoundError);
    });

    it('throws on invalid position', () => {
      expect(() => move_cards(exampleBoard, ['col0:card0'], 'col3', 99)).toThrow(InvalidPositionError);
    });

    it('does not mutate the original board', () => {
      const origLen = exampleBoard.columns[0].cards.length;
      move_cards(exampleBoard, ['col0:card0', 'col0:card1'], 'col3');
      expect(exampleBoard.columns[0].cards).toHaveLength(origLen);
    });
  });

  describe('rename_card', () => {
    it('renames a card', () => {
      const board = rename_card(exampleBoard, 'col0:card0', 'Renamed Post');
      expect(board.columns[0].cards[0].title).toBe('Renamed Post');
      expect(board.columns[0].cards[0].body).toBe('Content 1');
    });

    it('rejects empty title', () => {
      expect(() => rename_card(exampleBoard, 'col0:card0', '')).toThrow(InvalidContentError);
    });
  });

  describe('update_card_body', () => {
    it('updates card body', () => {
      const board = update_card_body(exampleBoard, 'col0:card0', 'New body');
      expect(board.columns[0].cards[0].body).toBe('New body');
    });

    it('clears card body', () => {
      const board = update_card_body(exampleBoard, 'col0:card0', '');
      expect(board.columns[0].cards[0].body).toBe('');
    });

    it('rejects dangerous content', () => {
      expect(() => update_card_body(exampleBoard, 'col0:card0', '# Bad')).toThrow(InvalidContentError);
    });

    it('rejects settings fences', () => {
      expect(() => update_card_body(exampleBoard, 'col0:card0', '```kanban-settings')).toThrow(InvalidContentError);
    });
  });

  describe('reorder_card', () => {
    it('reorders within column', () => {
      const board = reorder_card(exampleBoard, 'col0:card0', 1);
      expect(board.columns[0].cards[0].title).toBe('Post 2');
      expect(board.columns[0].cards[1].title).toBe('Post 1');
    });
  });

  describe('get_card', () => {
    it('gets card by ID', () => {
      const card = get_card(exampleBoard, 'col1:card0');
      expect(card.title).toBe('Post 3');
    });

    it('throws on invalid ID', () => {
      expect(() => get_card(exampleBoard, 'col9:card0')).toThrow(CardNotFoundError);
    });
  });

  describe('find_cards', () => {
    it('finds cards by title substring', () => {
      const cards = find_cards(exampleBoard, 'Post');
      expect(cards).toHaveLength(4);
    });

    it('is case-insensitive', () => {
      const cards = find_cards(exampleBoard, 'post');
      expect(cards).toHaveLength(4);
    });

    it('returns empty for no match', () => {
      const cards = find_cards(exampleBoard, 'nonexistent');
      expect(cards).toHaveLength(0);
    });
  });

  describe('list_cards', () => {
    it('lists cards in column', () => {
      const cards = list_cards(exampleBoard, 'col0');
      expect(cards).toHaveLength(2);
      expect(cards[0].title).toBe('Post 1');
    });

    it('returns empty for empty column', () => {
      const cards = list_cards(exampleBoard, 'col3');
      expect(cards).toHaveLength(0);
    });
  });
});
