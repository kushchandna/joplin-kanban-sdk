import type { Board, Card, Column, Settings, ParseResult } from './types.js';

const enum ParserState {
  INIT,
  IN_COLUMN,
  IN_CARD_BODY,
  IN_SETTINGS_BLOCK,
}

const enum SettingsBlockType {
  KANBAN,
  CARD,
  STACK,
}

interface CardBuilder {
  title: string;
  bodyLines: string[];
  cardSettings: Settings | null;
}

interface ColumnBuilder {
  title: string;
  cards: Card[];
  stackSettings: Settings | null;
}

function parseSettingsLines(raw: readonly string[]): Readonly<Record<string, string>> {
  const entries: Record<string, string> = {};
  for (const line of raw) {
    if (line.startsWith('#')) continue;
    const colonIdx = line.indexOf(': ');
    if (colonIdx !== -1) {
      entries[line.slice(0, colonIdx)] = line.slice(colonIdx + 2);
    }
  }
  return entries;
}

function buildSettings(rawLines: string[]): Settings {
  return {
    raw: [...rawLines],
    entries: parseSettingsLines(rawLines),
  };
}

function finalizeCard(builder: CardBuilder): Card {
  let body = builder.bodyLines.join('\n');
  body = body.replace(/^\n+/, '').replace(/\s+$/, '');
  return {
    title: builder.title,
    body,
    cardSettings: builder.cardSettings,
  };
}

export function parse(markdown: string): ParseResult {
  const lines = markdown.split('\n');
  const warnings: string[] = [];
  const columns: Column[] = [];

  let state: ParserState = ParserState.INIT;
  let previousState: ParserState = ParserState.INIT;
  let currentColumn: ColumnBuilder | null = null;
  let currentCard: CardBuilder | null = null;
  let settingsBlockType: SettingsBlockType = SettingsBlockType.KANBAN;
  let settingsRawLines: string[] = [];
  let boardSettings: Settings | null = null;

  function pushCard() {
    if (currentCard && currentColumn) {
      currentColumn.cards.push(finalizeCard(currentCard));
      currentCard = null;
    }
  }

  function pushColumn() {
    if (currentColumn) {
      columns.push({
        title: currentColumn.title,
        cards: [...currentColumn.cards],
        stackSettings: currentColumn.stackSettings,
      });
      currentColumn = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (state === ParserState.IN_SETTINGS_BLOCK) {
      if (line === '```') {
        const settings = buildSettings(settingsRawLines);
        settingsRawLines = [];

        if (settingsBlockType === SettingsBlockType.KANBAN) {
          boardSettings = settings;
        } else if (settingsBlockType === SettingsBlockType.STACK) {
          if (currentColumn) {
            currentColumn.stackSettings = settings;
          } else {
            warnings.push(`Line ${i + 1}: stack-settings outside of a column, ignoring`);
          }
        } else if (settingsBlockType === SettingsBlockType.CARD) {
          if (currentCard) {
            currentCard.cardSettings = settings;
          } else {
            warnings.push(`Line ${i + 1}: card-settings outside of a card, ignoring`);
          }
        }

        state = previousState;
        continue;
      }

      settingsRawLines.push(line);
      continue;
    }

    if (line.startsWith('```kanban-settings')) {
      pushCard();
      previousState = state;
      settingsBlockType = SettingsBlockType.KANBAN;
      settingsRawLines = [];
      state = ParserState.IN_SETTINGS_BLOCK;
      continue;
    }

    if (line.startsWith('```stack-settings')) {
      pushCard();
      previousState = state;
      settingsBlockType = SettingsBlockType.STACK;
      settingsRawLines = [];
      state = ParserState.IN_SETTINGS_BLOCK;
      continue;
    }

    if (line.startsWith('```card-settings')) {
      previousState = state;
      settingsBlockType = SettingsBlockType.CARD;
      settingsRawLines = [];
      state = ParserState.IN_SETTINGS_BLOCK;
      continue;
    }

    if (line.startsWith('# ')) {
      pushCard();
      pushColumn();
      currentColumn = {
        title: line.slice(2),
        cards: [],
        stackSettings: null,
      };
      state = ParserState.IN_COLUMN;
      continue;
    }

    if (line.startsWith('## ')) {
      pushCard();
      if (!currentColumn) {
        warnings.push(`Line ${i + 1}: card before any column, creating implicit column`);
        currentColumn = {
          title: '',
          cards: [],
          stackSettings: null,
        };
      }
      currentCard = {
        title: line.slice(3),
        bodyLines: [],
        cardSettings: null,
      };
      state = ParserState.IN_CARD_BODY;
      continue;
    }

    if (state === ParserState.IN_CARD_BODY && currentCard) {
      currentCard.bodyLines.push(line);
    }
  }

  pushCard();
  pushColumn();

  if (!boardSettings) {
    warnings.push('No ```kanban-settings block found');
    boardSettings = { raw: [], entries: {} };
  }

  const board: Board = {
    columns,
    boardSettings,
  };

  return { board, warnings };
}
