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

export type Haystack = { folded: string; squashed: string };

/** Folds a product's searchable text once, so typing does not redo it for every product on every key. */
export function makeHaystack(name: string, ...extra: (string | null | undefined)[]): Haystack {
  const hay = [name, ...extra].filter(Boolean).join(' ');
  return { folded: fold(hay), squashed: squash(hay) };
}

/** Precomputes what is needed to test many haystacks against the same query. */
export function makeHaystackMatcher(query: string): (h: Haystack) => boolean {
  const q = query.trim();
  if (!q) return () => true;
  const qSquashed = squash(q);
  const qWords = words(q);
  return (h) => {
    if (h.squashed.includes(qSquashed)) return true; // "coca cola" in "Cocacola"
    // every typed word appears somewhere (inside a word or inside the squashed text)
    return qWords.every((w) => h.folded.includes(w) || h.squashed.includes(w));
  };
}

export function makeMatcher(query: string): (name: string, ...extra: (string | null | undefined)[]) => boolean {
  const test = makeHaystackMatcher(query);
  return (name, ...extra) => test(makeHaystack(name, ...extra));
}

export function matchesQuery(query: string, name: string, ...extra: (string | null | undefined)[]) {
  return makeMatcher(query)(name, ...extra);
}
