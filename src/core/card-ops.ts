import type { Board, Card, CardId, ColumnId } from './types.js';
import { CardNotFoundError, InvalidPositionError } from './errors.js';
import { resolveColumnIndex } from './column-ops.js';
import { validateCardBody, validateCardTitle } from './validation.js';
import { get_display_title } from './link-helpers.js';

interface CardLocation {
  colIdx: number;
  cardIdx: number;
}

export function resolveCardId(board: Board, cardId: CardId): CardLocation {
  const match = cardId.match(/^col(\d+):card(\d+)$/);
  if (!match) throw new CardNotFoundError(cardId);
  const colIdx = parseInt(match[1], 10);
  const cardIdx = parseInt(match[2], 10);
  if (colIdx < 0 || colIdx >= board.columns.length) throw new CardNotFoundError(cardId);
  if (cardIdx < 0 || cardIdx >= board.columns[colIdx].cards.length) throw new CardNotFoundError(cardId);
  return { colIdx, cardIdx };
}

function updateCardInBoard(board: Board, colIdx: number, cardIdx: number, updater: (card: Card) => Card): Board {
  const columns = board.columns.map((col, ci) =>
    ci === colIdx
      ? { ...col, cards: col.cards.map((card, cdi) => cdi === cardIdx ? updater(card) : card) }
      : col
  );
  return { ...board, columns };
}

export function add_card(board: Board, columnId: ColumnId, title: string, body?: string, position?: number): Board {
  const colIdx = resolveColumnIndex(board, columnId);
  validateCardTitle(title);
  const cardBody = body ?? '';
  if (cardBody) validateCardBody(cardBody);

  const col = board.columns[colIdx];
  const pos = position ?? col.cards.length;
  if (pos < 0 || pos > col.cards.length) {
    throw new InvalidPositionError(pos, col.cards.length);
  }

  const newCard: Card = { title, body: cardBody, cardSettings: null };
  const cards = [...col.cards];
  cards.splice(pos, 0, newCard);

  const columns = board.columns.map((c, i) => i === colIdx ? { ...c, cards } : c);
  return { ...board, columns };
}

export function remove_card(board: Board, cardId: CardId): Board {
  const { colIdx, cardIdx } = resolveCardId(board, cardId);
  const col = board.columns[colIdx];
  const cards = col.cards.filter((_, i) => i !== cardIdx);
  const columns = board.columns.map((c, i) => i === colIdx ? { ...c, cards } : c);
  return { ...board, columns };
}

export function move_card(board: Board, cardId: CardId, toColumnId: ColumnId, position?: number): Board {
  const { colIdx: fromColIdx, cardIdx } = resolveCardId(board, cardId);
  const toColIdx = resolveColumnIndex(board, toColumnId);

  const card = board.columns[fromColIdx].cards[cardIdx];

  const fromCards = [...board.columns[fromColIdx].cards];
  fromCards.splice(cardIdx, 1);

  let toCards: Card[];
  if (fromColIdx === toColIdx) {
    toCards = fromCards;
  } else {
    toCards = [...board.columns[toColIdx].cards];
  }

  const pos = position ?? toCards.length;
  if (pos < 0 || pos > toCards.length) {
    throw new InvalidPositionError(pos, toCards.length);
  }
  toCards.splice(pos, 0, card);

  const columns = board.columns.map((col, i) => {
    if (i === fromColIdx && i === toColIdx) return { ...col, cards: toCards };
    if (i === fromColIdx) return { ...col, cards: fromCards };
    if (i === toColIdx) return { ...col, cards: toCards };
    return col;
  });

  return { ...board, columns };
}

export function rename_card(board: Board, cardId: CardId, newTitle: string): Board {
  const { colIdx, cardIdx } = resolveCardId(board, cardId);
  validateCardTitle(newTitle);
  return updateCardInBoard(board, colIdx, cardIdx, card => ({ ...card, title: newTitle }));
}

export function update_card_body(board: Board, cardId: CardId, newBody: string): Board {
  const { colIdx, cardIdx } = resolveCardId(board, cardId);
  if (newBody) validateCardBody(newBody);
  return updateCardInBoard(board, colIdx, cardIdx, card => ({ ...card, body: newBody }));
}

export function reorder_card(board: Board, cardId: CardId, newPosition: number): Board {
  const { colIdx } = resolveCardId(board, cardId);
  const columnId = `col${colIdx}`;
  return move_card(board, cardId, columnId, newPosition);
}

export function get_card(board: Board, cardId: CardId): Card {
  const { colIdx, cardIdx } = resolveCardId(board, cardId);
  return board.columns[colIdx].cards[cardIdx];
}

export function find_cards(board: Board, titleSubstring: string): readonly Card[] {
  const lower = titleSubstring.toLowerCase();
  const results: Card[] = [];
  for (const col of board.columns) {
    for (const card of col.cards) {
      if (get_display_title(card).toLowerCase().includes(lower)) {
        results.push(card);
      }
    }
  }
  return results;
}

export function list_cards(board: Board, columnId: ColumnId): readonly Card[] {
  const colIdx = resolveColumnIndex(board, columnId);
  return board.columns[colIdx].cards;
}
