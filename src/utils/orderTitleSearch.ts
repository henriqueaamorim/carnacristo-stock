export const ORDER_TITLE_SEARCH_MIN_LENGTH = 3;

export function normalizeOrderTitleSearch(input: string): string {
  return input.trim();
}

export function isOrderTitleSearchActive(input: string): boolean {
  return normalizeOrderTitleSearch(input).length >= ORDER_TITLE_SEARCH_MIN_LENGTH;
}

/** Escapa % e _ para uso seguro em ILIKE */
export function escapeIlikePattern(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&");
}

export function buildOrderTitleIlikePattern(term: string): string {
  return `%${escapeIlikePattern(normalizeOrderTitleSearch(term))}%`;
}
