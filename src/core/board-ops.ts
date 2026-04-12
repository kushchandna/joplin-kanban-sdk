import type { Board, ParseResult } from './types.js';
import { parse } from './parser.js';
import { serialize } from './serializer.js';

export function parse_board(markdown: string): ParseResult {
  return parse(markdown);
}

export function serialize_board(board: Board): string {
  return serialize(board);
}

export function is_kanban_board(markdown: string): boolean {
  return markdown.includes('```kanban-settings');
}
