import type { Board, Settings } from './types.js';

export function get_board_settings(board: Board): Settings {
  return board.boardSettings;
}

export function update_board_settings(board: Board, updates: Record<string, string>): Board {
  const newEntries = { ...board.boardSettings.entries, ...updates };
  const raw: string[] = [];
  for (const line of board.boardSettings.raw) {
    if (line.startsWith('#')) {
      raw.push(line);
      continue;
    }
    const colonIdx = line.indexOf(': ');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx);
      if (key in newEntries) {
        raw.push(`${key}: ${newEntries[key]}`);
        delete newEntries[key];
        continue;
      }
    }
    raw.push(line);
  }
  for (const [key, value] of Object.entries(newEntries)) {
    if (!(key in board.boardSettings.entries)) {
      raw.push(`${key}: ${value}`);
    }
  }

  const boardSettings: Settings = {
    raw,
    entries: { ...board.boardSettings.entries, ...updates },
  };
  return { ...board, boardSettings };
}
