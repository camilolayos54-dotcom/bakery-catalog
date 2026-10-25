// Tolerant product search: ignores case, accents, spaces and hyphens, and accepts the words in any order.
//   "coca cola"  finds "Cocacola 400 ml"        (spaces are ignored)
//   "pan bono"   finds "Pan de bono"            (every word must appear)
//   "gaseosa"    finds products in "Gaseosas…"  (the category name counts too)

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const squash = (s: string) => fold(s).replace(/[\s\-_.,]+/g, '');
const words = (s: string) => fold(s).split(/[\s\-_.,]+/).filter(Boolean);

/** Precomputes what is needed to test many products against the same query. */
export function makeMatcher(query: string): (name: string, ...extra: (string | null | undefined)[]) => boolean {
  const q = query.trim();
  if (!q) return () => true;
  const qSquashed = squash(q);
  const qWords = words(q);
  return (name, ...extra) => {
    const hay = [name, ...extra].filter(Boolean).join(' ');
    const hayFolded = fold(hay);
    const haySquashed = squash(hay);
    if (haySquashed.includes(qSquashed)) return true; // "coca cola" in "Cocacola"
    // every typed word appears somewhere (as a prefix of a word or inside the squashed text)
    return qWords.every((w) => hayFolded.includes(w) || haySquashed.includes(w));
  };
}

export function matchesQuery(query: string, name: string, ...extra: (string | null | undefined)[]) {
  return makeMatcher(query)(name, ...extra);
}
