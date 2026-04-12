import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import { JoplinClient } from '../../src/joplin/joplin-client.js';
import { NoteNotFoundError, AuthenticationError, JoplinApiError } from '../../src/joplin/errors.js';

let server: Server;
let port: number;
let client: JoplinClient;

const MOCK_NOTE = {
  id: 'abc123',
  title: 'Test Note',
  body: '# Col\n\n## Card\n\n```kanban-settings\n```\n',
  parent_id: 'folder1',
  updated_time: 1000,
  created_time: 900,
  is_todo: 0,
  todo_due: 0,
  todo_completed: 0,
};

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://localhost`);
  const token = url.searchParams.get('token');

  if (token !== 'test-token') {
    res.writeHead(401);
    res.end('Unauthorized');
    return;
  }

  const path = url.pathname;

  if (req.method === 'GET' && path === '/notes/abc123') {
    const fields = url.searchParams.get('fields')?.split(',');
    const note = fields
      ? Object.fromEntries(fields.map(f => [f, (MOCK_NOTE as Record<string, unknown>)[f]]))
      : MOCK_NOTE;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(note));
    return;
  }

  if (req.method === 'GET' && path === '/notes/missing') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (req.method === 'PUT' && path === '/notes/abc123') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...MOCK_NOTE, ...JSON.parse(body) }));
    });
    return;
  }

  if (req.method === 'POST' && path === '/notes') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...MOCK_NOTE, id: 'new123', ...data }));
    });
    return;
  }

  if (req.method === 'DELETE' && path === '/notes/abc123') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && path === '/search') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [MOCK_NOTE], has_more: false }));
    return;
  }

  if (req.method === 'GET' && path === '/folders') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [{ id: 'folder1', title: 'Notebook', parent_id: '' }], has_more: false }));
    return;
  }

  if (req.method === 'GET' && path === '/notes/abc123/tags') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [{ id: 'tag1', title: 'important' }], has_more: false }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

beforeAll(async () => {
  server = createServer(handleRequest);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const addr = server.address();
  port = typeof addr === 'object' && addr ? addr.port : 0;
  client = new JoplinClient({ baseUrl: `http://localhost:${port}`, token: 'test-token' });
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('JoplinClient', () => {
  describe('getNote', () => {
    it('fetches a note', async () => {
      const note = await client.getNote('abc123');
      expect(note.id).toBe('abc123');
      expect(note.title).toBe('Test Note');
    });

    it('fetches with specific fields', async () => {
      const note = await client.getNote('abc123', ['id', 'updated_time']);
      expect(note.id).toBe('abc123');
      expect(note.updated_time).toBe(1000);
    });

    it('throws NoteNotFoundError on 404', async () => {
      await expect(client.getNote('missing')).rejects.toThrow(NoteNotFoundError);
    });
  });

  describe('updateNote', () => {
    it('updates a note', async () => {
      await expect(client.updateNote('abc123', { body: 'new body' })).resolves.not.toThrow();
    });
  });

  describe('createNote', () => {
    it('creates a note', async () => {
      const note = await client.createNote({ title: 'New', body: 'Body', parent_id: 'folder1' });
      expect(note.id).toBe('new123');
      expect(note.title).toBe('New');
    });
  });

  describe('deleteNote', () => {
    it('deletes a note', async () => {
      await expect(client.deleteNote('abc123')).resolves.not.toThrow();
    });
  });

  describe('searchNotes', () => {
    it('searches and returns notes', async () => {
      const notes = await client.searchNotes('kanban');
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('abc123');
    });
  });

  describe('listFolders', () => {
    it('lists folders', async () => {
      const folders = await client.listFolders();
      expect(folders).toHaveLength(1);
      expect(folders[0].title).toBe('Notebook');
    });
  });

  describe('getNoteTags', () => {
    it('gets tags for a note', async () => {
      const tags = await client.getNoteTags('abc123');
      expect(tags).toHaveLength(1);
      expect(tags[0].title).toBe('important');
    });
  });

  describe('authentication', () => {
    it('throws AuthenticationError with bad token', async () => {
      const badClient = new JoplinClient({ baseUrl: `http://localhost:${port}`, token: 'bad-token' });
      await expect(badClient.getNote('abc123')).rejects.toThrow(AuthenticationError);
    });
  });
});
