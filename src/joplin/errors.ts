export class JoplinApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'JoplinApiError';
  }
}

export class NoteNotFoundError extends JoplinApiError {
  constructor(noteId: string) {
    super(`Note not found: ${noteId}`, 404, `/notes/${noteId}`);
    this.name = 'NoteNotFoundError';
  }
}

export class AuthenticationError extends JoplinApiError {
  constructor(endpoint: string) {
    super(`Authentication failed for ${endpoint}`, 401, endpoint);
    this.name = 'AuthenticationError';
  }
}

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}

export class ConcurrentModificationError extends Error {
  constructor(noteId: string, expectedTime: number, actualTime: number) {
    super(
      `Board ${noteId} was modified since fetch. ` +
      `Expected updated_time=${expectedTime}, found=${actualTime}. Re-fetch and retry.`
    );
    this.name = 'ConcurrentModificationError';
  }
}
