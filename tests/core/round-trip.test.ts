import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse_board, serialize_board } from '../../src/core/board-ops.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

const wellFormedFixtures = readdirSync(FIXTURES)
  .filter(f => f.endsWith('.md') && f !== 'no-settings-board.md');

describe('round-trip fidelity', () => {
  for (const fixture of wellFormedFixtures) {
    it(`round-trips ${fixture}`, () => {
      const original = readFileSync(join(FIXTURES, fixture), 'utf-8');
      const { board } = parse_board(original);
      const serialized = serialize_board(board);
      expect(serialized).toBe(original);
    });
  }
});

describe('weaker invariant for malformed input', () => {
  it('parse(serialize(parse(input))) === parse(input) for no-settings board', () => {
    const original = readFileSync(join(FIXTURES, 'no-settings-board.md'), 'utf-8');
    const parsed1 = parse_board(original).board;
    const serialized = serialize_board(parsed1);
    const parsed2 = parse_board(serialized).board;
    expect(parsed2).toEqual(parsed1);
  });
});
