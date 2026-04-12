export interface Settings {
  readonly raw: readonly string[];
  readonly entries: Readonly<Record<string, string>>;
}

export interface Card {
  readonly title: string;
  readonly body: string;
  readonly cardSettings: Settings | null;
}

export interface Column {
  readonly title: string;
  readonly cards: readonly Card[];
  readonly stackSettings: Settings | null;
}

export interface Board {
  readonly columns: readonly Column[];
  readonly boardSettings: Settings;
}

export interface ParseResult {
  readonly board: Board;
  readonly warnings: readonly string[];
}

export type ColumnId = string;
export type CardId = string;
