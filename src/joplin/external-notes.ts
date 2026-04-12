import type { Board, CardId } from '../core/types.js';
import { get_card, rename_card, update_card_body } from '../core/card-ops.js';
import { is_linked_card, get_link_id, make_link_title, get_display_title } from '../core/link-helpers.js';
import { InvalidContentError } from '../core/errors.js';
import type { JoplinBoard, NoteContent } from './types.js';
import type { JoplinClient } from './joplin-client.js';

export async function convert_to_external(
  client: JoplinClient,
  jboard: JoplinBoard,
  cardId: CardId,
  notebookId?: string,
): Promise<JoplinBoard> {
  const card = get_card(jboard.board, cardId);
  if (is_linked_card(card)) {
    throw new InvalidContentError('Card is already linked to an external note');
  }

  const targetNotebook = notebookId ?? jboard.notebookId;
  const newNote = await client.createNote({
    title: card.title,
    body: card.body,
    parent_id: targetNotebook,
  });

  const linkTitle = make_link_title(card.title, newNote.id);
  let board: Board = rename_card(jboard.board, cardId, linkTitle);
  board = update_card_body(board, cardId, '');

  return { ...jboard, board };
}

export async function convert_to_inline(
  client: JoplinClient,
  jboard: JoplinBoard,
  cardId: CardId,
  deleteNote: boolean = false,
): Promise<JoplinBoard> {
  const card = get_card(jboard.board, cardId);
  if (!is_linked_card(card)) {
    throw new InvalidContentError('Card is not linked to an external note');
  }

  const noteId = get_link_id(card)!;
  const note = await client.getNote(noteId, ['title', 'body']);

  const displayTitle = get_display_title(card);
  let board: Board = rename_card(jboard.board, cardId, displayTitle);
  board = update_card_body(board, cardId, note.body);

  if (deleteNote) {
    await client.deleteNote(noteId);
  }

  return { ...jboard, board };
}

export async function fetch_linked_note(
  client: JoplinClient,
  card: { title: string; body: string; cardSettings: null | { raw: readonly string[]; entries: Readonly<Record<string, string>> } },
): Promise<NoteContent> {
  const noteId = get_link_id(card as any);
  if (!noteId) {
    throw new InvalidContentError('Card is not linked to an external note');
  }

  const note = await client.getNote(noteId, ['id', 'title', 'body', 'parent_id']);
  return {
    noteId: note.id,
    title: note.title,
    body: note.body,
    notebookId: note.parent_id,
  };
}

export async function update_linked_note(
  client: JoplinClient,
  card: { title: string; body: string; cardSettings: null | { raw: readonly string[]; entries: Readonly<Record<string, string>> } },
  newBody: string,
): Promise<void> {
  const noteId = get_link_id(card as any);
  if (!noteId) {
    throw new InvalidContentError('Card is not linked to an external note');
  }

  await client.updateNote(noteId, { body: newBody });
}
