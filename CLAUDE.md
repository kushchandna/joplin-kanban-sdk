# Joplin Kanban SDK

## Quick Reference

- **Language**: TypeScript (ESM, Node 18+)
- **Test framework**: Vitest (`npm test`)
- **Type check**: `npx tsc --noEmit`
- **Run CLI**: `jkan <command> [args]` (after `npm link`; or `npx tsx src/cli/index.ts <command>` without linking)

## Architecture

Two-layer design with strict separation:

- **Core** (`src/core/`): Pure Markdown kanban parser/serializer and manipulation API. Zero I/O, zero Joplin dependencies. All operations are pure functions returning new immutable Board objects.
- **Joplin** (`src/joplin/`): Joplin Data API integration. HTTP client, board I/O with optimistic concurrency, external note management, sync.
- **CLI** (`src/cli/`): Command-line interface with JSON I/O for AI agent consumption.

## Key Patterns

- **Immutable data**: All core operations return new Board objects. Never mutate.
- **Position-based IDs**: Columns are `col0`, `col1`, etc. Cards are `col0:card0`, `col1:card2`, etc. These are computed from array indices, not stored.
- **Round-trip fidelity**: `serialize(parse(input)) === input` for well-formed boards. The parser preserves raw settings lines for exact reproduction.
- **Settings dual storage**: Each Settings has `raw` (original lines) and `entries` (parsed key-value map). Serializer uses `raw` for untouched settings.

## Parser

The parser (`src/core/parser.ts`) is a line-by-line state machine matching YesYouKan's `noteParser.ts` behavior exactly. It is NOT an AST-based Markdown parser.

- `# ` = column boundary
- `## ` = card boundary  
- `### ` and deeper = body content (not structural)
- Three settings block types: `kanban-settings`, `card-settings`, `stack-settings`
- Card bodies: leading newlines trimmed, trailing whitespace trimmed, internal blank lines preserved.

## Content Validation

Card bodies must not contain lines starting with `# ` or `## ` (would be misinterpreted as structural boundaries). The `validateCardBody` function in `validation.ts` enforces this.

## Layer 2 Config

- `JOPLIN_API_TOKEN` env var (required for API commands)
- `JOPLIN_API_URL` env var (optional, defaults to `http://localhost:41184`)
- Sync runs `joplin sync` via shell before reads and after writes

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run typecheck     # Type check only
```

Integration tests against a real Joplin CLI are gated by `JOPLIN_INTEGRATION_TEST=1`.
