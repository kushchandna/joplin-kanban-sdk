import { InvalidContentError } from './errors.js';

export function validateCardBody(body: string): void {
  if (body === '') return;
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ') || lines[i].startsWith('## ')) {
      throw new InvalidContentError(
        `Line ${i + 1} starts with "${lines[i].slice(0, lines[i].startsWith('## ') ? 3 : 2)}" ` +
        `which would be misinterpreted as a ${lines[i].startsWith('# ') ? 'column' : 'card'} boundary`
      );
    }
    if (lines[i].startsWith('```kanban-settings') ||
        lines[i].startsWith('```card-settings') ||
        lines[i].startsWith('```stack-settings')) {
      throw new InvalidContentError(
        `Line ${i + 1} contains a settings block fence which would corrupt the board structure`
      );
    }
  }
}

export function validateCardTitle(title: string): void {
  if (title === '') {
    throw new InvalidContentError('Card title must not be empty');
  }
  if (title.includes('\n')) {
    throw new InvalidContentError('Card title must not contain newlines');
  }
}
