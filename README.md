# Joplin Kanban SDK

An SDK for programmatically manipulating kanban boards stored as Markdown notes in Joplin, compatible with the [YesYouKan plugin](https://joplinapp.org/plugins/plugin/org.joplinapp.plugins.YesYouKan) board format.

Two-layer architecture:
- **Core** — Pure Markdown parser/serializer and manipulation API. No Joplin dependency.
- **Joplin** — Joplin Data API integration for reading/writing boards, managing linked notes, and syncing.

## Setup

```bash
npm install
npm link          # makes the `jkan` command available globally
npm test          # run all tests (145 unit/mock tests)
npm run typecheck # type-check without emitting
```

After `npm link`, the `jkan` command is available from any directory. No build step needed.

## CLI Usage

The CLI outputs JSON for programmatic consumption. Set `JOPLIN_API_TOKEN` for commands that talk to Joplin.

```bash
# Offline commands (Layer 1 only — no Joplin needed)
cat board.md | jkan parse
cat board.md | jkan is-kanban-board
echo '{"columns":[],"boardSettings":{"raw":["# Do not remove"],"entries":{}}}' \
  | jkan serialize

# Joplin commands (Layer 2 — requires running Joplin CLI)
export JOPLIN_API_TOKEN=your_token_here
jkan list-boards
jkan fetch-board --id <note_id>
jkan add-card --board <note_id> --column col0 --title "New task"
jkan move-card --board <note_id> --card col0:card0 --to-column col1

# See all commands
jkan --help
```

> **Without `npm link`**: You can also run `jkan <command>` directly from the project directory.

---

## Running Joplin CLI as a Background Service

The Joplin terminal client provides a local REST API that this skill talks to. Here's how to set it up on a headless Linux server.

### 1. Install Joplin CLI

```bash
npm install -g joplin
```

Verify:
```bash
joplin version
```

### 2. Initial Configuration

Run Joplin once interactively to set up sync and generate an API token:

```bash
joplin

# Inside the Joplin REPL:
config sync.target 9                        # 9 = Joplin Server (or 7 for Joplin Cloud)
config sync.9.path https://your-joplin-server.com
config sync.9.username your@email.com
config sync.9.password your_password

# Create a notebook for testing
mkbook "Test Notebook"

# Trigger initial sync
sync

# Exit the REPL
exit
```

### 3. Get the API Token

The API token is auto-generated. Retrieve it:

```bash
joplin config api.token
```

Save this value — you'll need it as `JOPLIN_API_TOKEN`.

If no token exists yet, you can set one:
```bash
joplin config api.token $(openssl rand -hex 32)
```

### 4. Run as a Systemd Service

Create `/etc/systemd/system/joplin.service`:

```ini
[Unit]
Description=Joplin Terminal Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=kush
ExecStart=/usr/bin/joplin server start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

> **Note**: The `joplin server start` command starts the API server on port 41184. If your `joplin` binary is installed via npm globally, find its path with `which joplin` and update `ExecStart` accordingly.

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable joplin
sudo systemctl start joplin
sudo systemctl status joplin
```

Verify the API is responding:

```bash
curl "http://localhost:41184/ping"
# Should return: JoplinClipperServer
```

### 5. Set Up Periodic Sync

Joplin CLI's `server start` mode does not auto-sync. Set up a cron job or systemd timer:

**Option A — Cron** (every 5 minutes):
```bash
crontab -e
# Add:
*/5 * * * * /usr/bin/joplin sync 2>&1 | logger -t joplin-sync
```

**Option B — Systemd timer**:

Create `/etc/systemd/system/joplin-sync.service`:
```ini
[Unit]
Description=Joplin Sync

[Service]
Type=oneshot
User=kush
ExecStart=/usr/bin/joplin sync
```

Create `/etc/systemd/system/joplin-sync.timer`:
```ini
[Unit]
Description=Joplin Sync Timer

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now joplin-sync.timer
```

---

## End-to-End Manual Testing

Once Joplin CLI is running with its API on port 41184:

### Step 1: Verify API access

```bash
export JOPLIN_API_TOKEN=$(joplin config api.token)

# Check the API responds
curl "http://localhost:41184/ping"

# List notebooks (should show at least one)
curl "http://localhost:41184/folders?token=$JOPLIN_API_TOKEN" | jq .
```

### Step 2: Test offline commands (Layer 1)

```bash
# Parse the example fixture
cat tests/fixtures/example-board.md | jkan parse | jq .

# Verify round-trip: parse then serialize should reproduce original
cat tests/fixtures/example-board.md | jkan parse \
  | jq .board | jkan serialize > /tmp/roundtrip.md
diff tests/fixtures/example-board.md /tmp/roundtrip.md
# No output = perfect round-trip
```

### Step 3: Create a board via the API

```bash
# Get a notebook ID
NOTEBOOK_ID=$(curl -s "http://localhost:41184/folders?token=$JOPLIN_API_TOKEN" | jq -r '.items[0].id')

# Create a kanban board
jkan create-board \
  --notebook "$NOTEBOOK_ID" \
  --title "Test Board" \
  --columns "Inbox,In Progress,Done" | jq .

# Note the noteId from the output
BOARD_ID=<paste noteId here>
```

### Step 4: Manipulate the board

```bash
# Add cards
jkan add-card --board $BOARD_ID --column col0 --title "Buy groceries" --body "Milk, eggs, bread"
jkan add-card --board $BOARD_ID --column col0 --title "Write report"

# List cards in Inbox
jkan list-cards --board $BOARD_ID --column col0 | jq .

# Move a card to In Progress
jkan move-card --board $BOARD_ID --card col0:card0 --to-column col1

# Fetch the board and inspect
jkan fetch-board --id $BOARD_ID | jq '.board.columns[] | {title, cards: [.cards[].title]}'
```

### Step 5: Test external notes

```bash
# Convert an inline card to a linked external note
jkan convert-to-external --board $BOARD_ID --card col1:card0

# The card title is now a [link](:/id) — fetch to verify
jkan fetch-board --id $BOARD_ID | jq '.board.columns[1].cards[0].title'

# Convert back to inline
jkan convert-to-inline --board $BOARD_ID --card col1:card0
```

### Step 6: Verify in Joplin Desktop

If you have Joplin Desktop running on another machine synced to the same Joplin Server:

1. Trigger sync in Joplin Desktop
2. Open the "Test Board" note
3. The YesYouKan plugin should render it as a kanban board
4. Verify the columns and cards match what you created via the CLI

### Step 7: Run the integration test suite

```bash
export JOPLIN_API_TOKEN=$(joplin config api.token)
JOPLIN_INTEGRATION_TEST=1 npx vitest run tests/joplin/integration.test.ts
```

This runs 3 automated tests that create boards, add/move cards, convert to/from external notes, and clean up after themselves.

### Step 8: Clean up

Delete any test boards you created manually:

```bash
# List all kanban boards
jkan list-boards | jq '.[] | {noteId, title}'

# Delete via the Joplin API directly
curl -X DELETE "http://localhost:41184/notes/$BOARD_ID?token=$JOPLIN_API_TOKEN"
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `JOPLIN_API_TOKEN environment variable is required` | Export the token: `export JOPLIN_API_TOKEN=$(joplin config api.token)` |
| `fetch failed` / connection refused | Joplin API server isn't running. Start it: `joplin server start` or check systemd service |
| `SyncError: joplin sync failed` | Joplin CLI not in PATH, or sync credentials not configured |
| `ConcurrentModificationError` | Another client modified the board between your fetch and save. Re-fetch and retry. |
| `NoteNotFoundError` | The note ID is wrong or the note was deleted. Run `list-boards` to find valid IDs. |
| Board doesn't appear in YesYouKan | Ensure the note body contains a `` ```kanban-settings `` block. Run `sync` on both CLI and Desktop. |

## Project Structure

```
src/
  core/            # Pure Markdown library (no I/O)
    parser.ts      # Line-by-line state machine parser
    serializer.ts  # Board -> Markdown
    board-ops.ts   # parse_board, serialize_board, is_kanban_board
    column-ops.ts  # Column CRUD
    card-ops.ts    # Card CRUD
    link-helpers.ts # Linked card detection/construction
    settings-ops.ts # Board settings
    validation.ts  # Content validation
    types.ts       # Board, Column, Card, Settings
    errors.ts      # Core error types

  joplin/          # Joplin integration (HTTP + sync)
    joplin-client.ts  # REST API wrapper
    board-io.ts       # fetch/save/list/create boards
    external-notes.ts # Linked note CRUD
    note-metadata.ts  # Due dates, tags, completion
    sync.ts           # joplin sync trigger
    types.ts          # Joplin-specific types
    errors.ts         # Joplin error types

  cli/             # Command-line interface
    index.ts       # Entry point
    commands.ts    # 23 commands with JSON I/O

tests/
  fixtures/        # Markdown test fixtures
  core/            # 107 unit tests
  joplin/          # 32 tests (mock + integration)
  cli/             # 6 CLI tests
```
