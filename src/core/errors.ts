export class KanbanError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'KanbanError';
  }
}

export class ColumnNotFoundError extends KanbanError {
  constructor(columnId: string) {
    super(`Column not found: ${columnId}`, 'COLUMN_NOT_FOUND');
    this.name = 'ColumnNotFoundError';
  }
}

export class CardNotFoundError extends KanbanError {
  constructor(cardId: string) {
    super(`Card not found: ${cardId}`, 'CARD_NOT_FOUND');
    this.name = 'CardNotFoundError';
  }
}

export class ColumnNotEmptyError extends KanbanError {
  constructor(columnId: string) {
    super(`Column is not empty: ${columnId}`, 'COLUMN_NOT_EMPTY');
    this.name = 'ColumnNotEmptyError';
  }
}

export class InvalidPositionError extends KanbanError {
  constructor(position: number, max: number) {
    super(`Position ${position} is out of bounds (max: ${max})`, 'INVALID_POSITION');
    this.name = 'InvalidPositionError';
  }
}

export class InvalidContentError extends KanbanError {
  constructor(message: string) {
    super(message, 'INVALID_CONTENT');
    this.name = 'InvalidContentError';
  }
}
