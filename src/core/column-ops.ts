import type { Board, Column, ColumnId } from './types.js';
import { ColumnNotFoundError, ColumnNotEmptyError, InvalidPositionError } from './errors.js';

export function resolveColumnIndex(board: Board, columnId: ColumnId): number {
  const match = columnId.match(/^col(\d+)$/);
  if (!match) throw new ColumnNotFoundError(columnId);
  const idx = parseInt(match[1], 10);
  if (idx < 0 || idx >= board.columns.length) throw new ColumnNotFoundError(columnId);
  return idx;
}

export function add_column(board: Board, title: string, position?: number): Board {
  const pos = position ?? board.columns.length;
  if (pos < 0 || pos > board.columns.length) {
    throw new InvalidPositionError(pos, board.columns.length);
  }
  const newColumn: Column = { title, cards: [], stackSettings: null };
  const columns = [...board.columns];
  columns.splice(pos, 0, newColumn);
  return { ...board, columns };
}

export function remove_column(board: Board, columnId: ColumnId): Board {
  const idx = resolveColumnIndex(board, columnId);
  if (board.columns[idx].cards.length > 0) {
    throw new ColumnNotEmptyError(columnId);
  }
  const columns = board.columns.filter((_, i) => i !== idx);
  return { ...board, columns };
}

export function rename_column(board: Board, columnId: ColumnId, newTitle: string): Board {
  const idx = resolveColumnIndex(board, columnId);
  const columns = board.columns.map((col, i) =>
    i === idx ? { ...col, title: newTitle } : col
  );
  return { ...board, columns };
}

export function move_column(board: Board, columnId: ColumnId, newPosition: number): Board {
  const idx = resolveColumnIndex(board, columnId);
  if (newPosition < 0 || newPosition >= board.columns.length) {
    throw new InvalidPositionError(newPosition, board.columns.length - 1);
  }
  if (idx === newPosition) return board;
  const columns = [...board.columns];
  const [col] = columns.splice(idx, 1);
  columns.splice(newPosition, 0, col);
  return { ...board, columns };
}

export function get_column(board: Board, columnId: ColumnId): Column {
  const idx = resolveColumnIndex(board, columnId);
  return board.columns[idx];
}

export function list_columns(board: Board): readonly Column[] {
  return board.columns;
}
