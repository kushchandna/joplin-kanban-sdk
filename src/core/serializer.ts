import type { Board, Settings } from './types.js';

function serializeSettings(fence: string, settings: Settings): string {
  let result = '```' + fence + '\n';
  for (const line of settings.raw) {
    result += line + '\n';
  }
  result += '```\n';
  return result;
}

export function serialize(board: Board): string {
  const parts: string[] = [];

  for (const column of board.columns) {
    parts.push(`# ${column.title}\n\n`);

    if (column.stackSettings) {
      parts.push(serializeSettings('stack-settings', column.stackSettings) + '\n');
    }

    for (const card of column.cards) {
      parts.push(`## ${card.title}\n\n`);

      if (card.body !== '') {
        parts.push(card.body + '\n\n');
      }

      if (card.cardSettings) {
        parts.push(serializeSettings('card-settings', card.cardSettings) + '\n');
      }
    }
  }

  parts.push(serializeSettings('kanban-settings', board.boardSettings));

  return parts.join('');
}
