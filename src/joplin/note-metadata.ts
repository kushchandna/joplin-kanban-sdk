import type { Card } from '../core/types.js';
import { get_link_id } from '../core/link-helpers.js';
import { InvalidContentError } from '../core/errors.js';
import type { NoteMetadata, Tag } from './types.js';
import type { JoplinClient } from './joplin-client.js';

function requireLinkedNoteId(card: Card): string {
  const noteId = get_link_id(card);
  if (!noteId) {
    throw new InvalidContentError('Card is not linked to an external note');
  }
  return noteId;
}

export async function set_due_date(client: JoplinClient, card: Card, date: Date): Promise<void> {
  const noteId = requireLinkedNoteId(card);
  await client.updateNote(noteId, {
    is_todo: 1,
    todo_due: date.getTime(),
  });
}

export async function mark_complete(client: JoplinClient, card: Card): Promise<void> {
  const noteId = requireLinkedNoteId(card);
  await client.updateNote(noteId, {
    is_todo: 1,
    todo_completed: Date.now(),
  });
}

export async function get_note_tags(client: JoplinClient, card: Card): Promise<readonly Tag[]> {
  const noteId = requireLinkedNoteId(card);
  return client.getNoteTags(noteId);
}

export async function get_note_metadata(client: JoplinClient, card: Card): Promise<NoteMetadata> {
  const noteId = requireLinkedNoteId(card);
  const note = await client.getNote(noteId, [
    'id', 'title', 'created_time', 'updated_time', 'is_todo', 'todo_due', 'todo_completed',
  ]);
  return {
    noteId: note.id,
    title: note.title,
    createdTime: note.created_time,
    updatedTime: note.updated_time,
    isTodo: note.is_todo === 1,
    todoDue: note.todo_due || null,
    todoCompleted: note.todo_completed || null,
  };
}
