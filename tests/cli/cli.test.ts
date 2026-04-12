import { describe, it, expect } from 'vitest';
import { execFile } from 'child_process';
import { join } from 'path';
import { readFileSync } from 'fs';

const CLI = join(import.meta.dirname, '..', '..', 'src', 'cli', 'index.ts');
const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

function run(command: string, args: string[] = [], stdin?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise(resolve => {
    const proc = execFile('npx', ['tsx', CLI, command, ...args], { timeout: 10000 }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, exitCode: error?.code ? 1 : proc.exitCode ?? 0 });
    });
    if (stdin) {
      proc.stdin!.write(stdin);
      proc.stdin!.end();
    }
  });
}

describe('CLI', () => {
  describe('parse', () => {
    it('parses markdown from stdin to JSON', async () => {
      const md = readFileSync(join(FIXTURES, 'example-board.md'), 'utf-8');
      const { stdout, exitCode } = await run('parse', [], md);
      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.board.columns).toHaveLength(4);
      expect(result.board.columns[0].title).toBe('Draft');
      expect(result.warnings).toEqual([]);
    });
  });

  describe('serialize', () => {
    it('serializes JSON board back to markdown', async () => {
      const md = readFileSync(join(FIXTURES, 'minimal-board.md'), 'utf-8');
      const { stdout: parseOut } = await run('parse', [], md);
      const parsed = JSON.parse(parseOut);

      const { stdout, exitCode } = await run('serialize', [], JSON.stringify(parsed.board));
      expect(exitCode).toBe(0);
      expect(stdout.trimEnd()).toBe(md.trimEnd());
    });
  });

  describe('is-kanban-board', () => {
    it('returns true for kanban board', async () => {
      const md = readFileSync(join(FIXTURES, 'example-board.md'), 'utf-8');
      const { stdout, exitCode } = await run('is-kanban-board', [], md);
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({ result: true });
    });

    it('returns false for non-kanban content', async () => {
      const { stdout, exitCode } = await run('is-kanban-board', [], '# Just a heading\n\nSome text');
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({ result: false });
    });
  });

  describe('unknown command', () => {
    it('outputs error JSON to stderr', async () => {
      const { stderr, exitCode } = await run('nonexistent');
      expect(exitCode).not.toBe(0);
      const err = JSON.parse(stderr);
      expect(err.code).toBe('UNKNOWN_COMMAND');
    });
  });

  describe('help', () => {
    it('shows help with --help flag', async () => {
      const result = await run('--help');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('parse');
      expect(result.stdout).toContain('add-card');
    });
  });
});
