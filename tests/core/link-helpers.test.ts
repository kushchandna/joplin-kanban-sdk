import { describe, it, expect } from 'vitest';
import { is_linked_card, get_link_id, make_link_title, get_display_title } from '../../src/core/link-helpers.js';
import type { Card } from '../../src/core/types.js';

function card(title: string): Card {
  return { title, body: '', cardSettings: null };
}

describe('link helpers', () => {
  describe('is_linked_card', () => {
    it('returns true for linked card', () => {
      expect(is_linked_card(card('[Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)'))).toBe(true);
    });

    it('returns false for plain title', () => {
      expect(is_linked_card(card('Plain Card'))).toBe(false);
    });

    it('returns false for non-joplin link', () => {
      expect(is_linked_card(card('[Link](https://example.com)'))).toBe(false);
    });

    it('returns false for wrong ID length', () => {
      expect(is_linked_card(card('[Task](:/abc123)'))).toBe(false);
    });
  });

  describe('get_link_id', () => {
    it('extracts 32-hex ID', () => {
      expect(get_link_id(card('[Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)'))).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
    });

    it('returns null for non-linked card', () => {
      expect(get_link_id(card('Plain'))).toBeNull();
    });
  });

  describe('make_link_title', () => {
    it('creates link from title and ID', () => {
      expect(make_link_title('My Task', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'))
        .toBe('[My Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)');
    });

    it('escapes brackets in title', () => {
      expect(make_link_title('[Important] Task', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'))
        .toBe('[\\[Important\\] Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)');
    });
  });

  describe('get_display_title', () => {
    it('returns title text from linked card', () => {
      expect(get_display_title(card('[My Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)'))).toBe('My Task');
    });

    it('returns raw title when escaped brackets prevent regex match', () => {
      const raw = '[\\[Important\\] Task](:/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6)';
      expect(get_display_title(card(raw))).toBe(raw);
    });

    it('returns plain title as-is', () => {
      expect(get_display_title(card('Plain Card'))).toBe('Plain Card');
    });
  });
});
