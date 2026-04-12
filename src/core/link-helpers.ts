import type { Card } from './types.js';

const LINKED_CARD_RE = /^\[([^\]]+)\]\(:\/([a-f0-9]{32})\)$/;

export function is_linked_card(card: Card): boolean {
  return LINKED_CARD_RE.test(card.title);
}

export function get_link_id(card: Card): string | null {
  const match = card.title.match(LINKED_CARD_RE);
  return match ? match[2] : null;
}

function escapeTitleText(text: string): string {
  return text.replace(/[\[\]]/g, '\\$&');
}

function escapeLinkUrl(url: string): string {
  return url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/ /g, '%20');
}

export function make_link_title(title: string, noteId: string): string {
  return `[${escapeTitleText(title)}](:/${escapeLinkUrl(noteId)})`;
}

export function get_display_title(card: Card): string {
  const match = card.title.match(LINKED_CARD_RE);
  if (match) {
    return match[1].replace(/\\([\[\]])/g, '$1');
  }
  return card.title;
}
