import type { Board } from '../core/types.js';

export interface JoplinConfig {
  readonly baseUrl: string;
  readonly token: string;
}

export const DEFAULT_CONFIG: Partial<JoplinConfig> = {
  baseUrl: 'http://localhost:41184',
};

export interface JoplinBoard {
  readonly board: Board;
  readonly noteId: string;
  readonly noteTitle: string;
  readonly notebookId: string;
  readonly updatedTime: number;
}

export interface BoardInfo {
  readonly noteId: string;
  readonly title: string;
  readonly notebookId: string;
  readonly updatedTime: number;
  readonly columnCount: number;
  readonly cardCount: number;
}

export interface NoteContent {
  readonly noteId: string;
  readonly title: string;
  readonly body: string;
  readonly notebookId: string;
}

export interface NoteMetadata {
  readonly noteId: string;
  readonly title: string;
  readonly createdTime: number;
  readonly updatedTime: number;
  readonly isTodo: boolean;
  readonly todoDue: number | null;
  readonly todoCompleted: number | null;
}

export interface Tag {
  readonly id: string;
  readonly title: string;
}

export interface JoplinNote {
  id: string;
  title: string;
  body: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  is_todo: number;
  todo_due: number;
  todo_completed: number;
}

export interface JoplinFolder {
  id: string;
  title: string;
  parent_id: string;
}
