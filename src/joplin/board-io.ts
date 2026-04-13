import type { Board } from '../core/types.js';
import { parse_board, serialize_board, is_kanban_board } from '../core/board-ops.js';
import type { JoplinBoard, BoardInfo } from './types.js';
import { JoplinClient } from './joplin-client.js';
import { ConcurrentModificationError } from './errors.js';

export async function fetch_board(client: JoplinClient, noteId: string): Promise<JoplinBoard> {
  const note = await client.getNote(noteId, ['id', 'title', 'body', 'parent_id', 'updated_time']);

  const { board } = parse_board(note.body);

  return {
    board,
    noteId: note.id,
    noteTitle: note.title,
    notebookId: note.parent_id,
    updatedTime: note.updated_time,
  };
}

export async function save_board(
  client: JoplinClient,
  jboard: JoplinBoard,
  newBoard: Board,
): Promise<JoplinBoard> {
  const markdown = serialize_board(newBoard);

  const current = await client.getNote(jboard.noteId, ['updated_time']);
  if (current.updated_time !== jboard.updatedTime) {
    throw new ConcurrentModificationError(jboard.noteId, jboard.updatedTime, current.updated_time);
  }

  await client.updateNote(jboard.noteId, { body: markdown });

  const updated = await client.getNote(jboard.noteId, ['updated_time']);

  return {
    ...jboard,
    board: newBoard,
    updatedTime: updated.updated_time,
  };
}

export async function list_boards(client: JoplinClient): Promise<readonly BoardInfo[]> {
  const notes = await client.searchNotes('```kanban-settings');
  const boards: BoardInfo[] = [];

  for (const note of notes) {
    if (!is_kanban_board(note.body)) continue;
    const { board } = parse_board(note.body);
    const cardCount = board.columns.reduce((sum, col) => sum + col.cards.length, 0);
    boards.push({
      noteId: note.id,
      title: note.title,
      notebookId: note.parent_id,
      updatedTime: note.updated_time,
      columnCount: board.columns.length,
      cardCount,
    });
  }

  return boards;
}

export async function create_board(
  client: JoplinClient,
  notebookId: string,
  title: string,
  columns?: string[],
): Promise<JoplinBoard> {
  let board: Board = {
    columns: [],
    boardSettings: {
      raw: ['# Do not remove this block'],
      entries: {},
    },
  };

  if (columns) {
    board = {
      ...board,
      columns: columns.map(colTitle => ({
        title: colTitle,
        cards: [],
        stackSettings: null,
      })),
    };
  }

  const markdown = serialize_board(board);

  const note = await client.createNote({
    title,
    body: markdown,
    parent_id: notebookId,
  });

  return {
    board,
    noteId: note.id,
    noteTitle: note.title,
    notebookId: note.parent_id,
    updatedTime: note.updated_time,
  };
}
