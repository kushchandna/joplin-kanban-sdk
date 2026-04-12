import type { JoplinConfig, JoplinNote, JoplinFolder, Tag } from './types.js';
import { JoplinApiError, NoteNotFoundError, AuthenticationError } from './errors.js';

export class JoplinClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: Pick<JoplinConfig, 'baseUrl' | 'token'>) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  private url(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set('token', this.token);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    return url.toString();
  }

  private async request<T>(method: string, path: string, params?: Record<string, string>, body?: unknown): Promise<T> {
    const options: RequestInit = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }

    const response = await fetch(this.url(path, params), options);

    if (!response.ok) {
      const endpoint = `${method} ${path}`;
      if (response.status === 404) {
        const noteMatch = path.match(/^\/notes\/([^/]+)/);
        if (noteMatch) throw new NoteNotFoundError(noteMatch[1]);
      }
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(endpoint);
      }
      const text = await response.text().catch(() => '');
      throw new JoplinApiError(`${endpoint} failed: ${response.status} ${text}`, response.status, endpoint);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async getNote(id: string, fields?: string[]): Promise<JoplinNote> {
    const params: Record<string, string> = {};
    if (fields) params['fields'] = fields.join(',');
    return this.request<JoplinNote>('GET', `/notes/${id}`, params);
  }

  async updateNote(id: string, data: Partial<Pick<JoplinNote, 'title' | 'body' | 'parent_id' | 'is_todo' | 'todo_due' | 'todo_completed'>>): Promise<void> {
    await this.request<JoplinNote>('PUT', `/notes/${id}`, undefined, data);
  }

  async createNote(data: { title: string; body: string; parent_id: string }): Promise<JoplinNote> {
    return this.request<JoplinNote>('POST', '/notes', undefined, data);
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<void>('DELETE', `/notes/${id}`);
  }

  async searchNotes(query: string): Promise<JoplinNote[]> {
    const results: JoplinNote[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request<{ items: JoplinNote[]; has_more: boolean }>(
        'GET', '/search', { query, type: 'note', page: String(page), fields: 'id,title,body,parent_id,updated_time' }
      );
      results.push(...response.items);
      hasMore = response.has_more;
      page++;
    }

    return results;
  }

  async listFolders(): Promise<JoplinFolder[]> {
    const results: JoplinFolder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request<{ items: JoplinFolder[]; has_more: boolean }>(
        'GET', '/folders', { page: String(page) }
      );
      results.push(...response.items);
      hasMore = response.has_more;
      page++;
    }

    return results;
  }

  async getNoteTags(noteId: string): Promise<Tag[]> {
    const response = await this.request<{ items: Tag[]; has_more: boolean }>(
      'GET', `/notes/${noteId}/tags`
    );
    return response.items;
  }
}
