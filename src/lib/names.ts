/** Names that differ only by case, accents or spacing are the same name ("Pasteles" == " pastéles "). */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export const DUPLICATE_NAME = 'DUPLICATE_NAME';

export function isDuplicateError(e: unknown): boolean {
  return e instanceof Error && e.message === DUPLICATE_NAME;
}
