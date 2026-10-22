// Pure (no I/O) logic for the "Bakery" folder, the Obsidian-style vault:
//
//   Bakery/
//     _orden.md                 group order (optional)
//     Panes/                    group
//       Pan de bono.md          product (front matter: precio, promo_cantidad, promo_precio, imagen)
//       Pan de bono.jpg         cover, same name
//       Tradicionales/          subcategory
//         Croissant.md
//
// Anything starting with "." (e.g. .obsidian) or "_" (notes, templates) is ignored as a product.

import { parsePrice } from '@/lib/money';

export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
export const ORDER_FILE = '_orden.md';
export const PLACEHOLDER_FILE = '_grupo.md';

export type VaultProduct = {
  name: string;
  group: string | null;
  sub: string | null;
  price_cents: number;
  promo_qty: number | null;
  promo_price_cents: number | null;
  /** Hand-made order from the `orden:` line, if the note has one. */
  sort_order: number | null;
  /** Path of the .md file. */
  path: string[];
  /** Path of the cover image, if any. */
  imagePath: string[] | null;
};

export type VaultModel = {
  /** Groups in display order. */
  groups: string[];
  /** group -> subcategories (alphabetical). */
  subs: Record<string, string[]>;
  products: VaultProduct[];
};

export type ExportInput = {
  groups: { id: number; name: string }[];
  subcategories: { id: number; group_id: number; name: string }[];
  products: {
    id: number;
    name: string;
    price_cents: number;
    image_uri: string | null;
    group_id: number | null;
    subcategory_id: number | null;
    promo_qty: number | null;
    promo_price_cents: number | null;
    sort_order: number;
  }[];
};

export type ExportPlan = {
  /**
   * Text files to write. For `kind: 'product'` the text is only the front matter: the body
   * the user typed below it is preserved (see mergeFrontmatter).
   */
  files: { path: string[]; text: string; kind: 'product' | 'meta' }[];
  /** Cover images to write; the adapter reads the bytes from the product. */
  images: { path: string[]; productId: number; source: string }[];
};

// ---------------------------------------------------------------- names

/** Makes a name safe to use as file/folder name on Windows and Android. */
export function safeName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|#^[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return cleaned || 'Sin nombre';
}

export function extOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i < 0 ? '' : fileName.slice(i + 1).toLowerCase();
}

export function baseOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i < 0 ? fileName : fileName.slice(0, i);
}

function isHidden(path: string[]) {
  return path.some((seg) => seg.startsWith('.'));
}

const key = (path: string[]) => path.join('/');

// ---------------------------------------------------------- front matter

function fold(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Parses the "key: value" lines between the first pair of --- lines. */
export function parseFrontmatter(text: string): Record<string, string> {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!src.startsWith('---\n')) return {};
  const end = src.indexOf('\n---', 4);
  if (end < 0) return {};
  const out: Record<string, string> = {};
  for (const line of src.slice(4, end).split('\n')) {
    const m = line.match(/^\s*([^:#]+?)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[fold(m[1]).replace(/\s+/g, '_')] = v;
  }
  return out;
}

/** Splits a note into its front matter block (with the closing ---) and the rest. */
export function splitFrontmatter(text: string): { fm: string; body: string } {
  const src = text.replace(/^﻿/, '');
  const m = src.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { fm: '', body: src };
  return { fm: m[0], body: src.slice(m[0].length) };
}

/** Replaces the front matter of an existing note keeping whatever the user wrote below it. */
export function mergeFrontmatter(existing: string, newFm: string): string {
  const { body } = splitFrontmatter(existing);
  return newFm + body;
}

function pick(fm: Record<string, string>, ...names: string[]) {
  for (const n of names) if (fm[n] !== undefined && fm[n] !== '') return fm[n];
  return undefined;
}

function pesos(cents: number) {
  const v = cents / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '');
}

export function serializeProduct(p: {
  price_cents: number;
  promo_qty: number | null;
  promo_price_cents: number | null;
  imageName: string | null;
  order?: number | null;
}): string {
  const lines = ['---', `precio: ${pesos(p.price_cents)}`];
  if (p.promo_qty && p.promo_qty > 1 && p.promo_price_cents != null) {
    lines.push(`promo_cantidad: ${p.promo_qty}`, `promo_precio: ${pesos(p.promo_price_cents)}`);
  }
  if (p.order != null) lines.push(`orden: ${p.order}`);
  if (p.imageName) lines.push(`imagen: ${p.imageName}`);
  lines.push('---', '');
  return lines.join('\n');
}

export function parseProductText(text: string) {
  const fm = parseFrontmatter(text);
  const price = pick(fm, 'precio', 'price');
  const promoQty = Math.floor(Number(pick(fm, 'promo_cantidad', 'promo_qty', 'promocion_cantidad') ?? ''));
  const promoPriceRaw = pick(fm, 'promo_precio', 'promo_price', 'promocion_precio');
  const promoPrice = promoPriceRaw != null ? parsePrice(promoPriceRaw) : null;
  const hasPromo = promoQty >= 2 && promoPrice != null;
  const orderRaw = pick(fm, 'orden', 'order');
  const order = orderRaw != null && /^-?\d+$/.test(orderRaw.trim()) ? Number(orderRaw.trim()) : null;
  return {
    order,
    price_cents: (price != null ? parsePrice(price) : null) ?? 0,
    promo_qty: hasPromo ? promoQty : null,
    promo_price_cents: hasPromo ? promoPrice : null,
    image: pick(fm, 'imagen', 'image', 'portada') ?? null,
  };
}

// ----------------------------------------------------------------- import

/** Builds the catalog model from the list of files in the folder. */
export async function modelFromVault(
  files: string[][],
  readText: (path: string[]) => Promise<string>,
): Promise<VaultModel> {
  const visible = files.filter((f) => !isHidden(f));
  const fileSet = new Set(visible.map(key));
  const groupSet = new Set<string>();
  const subs: Record<string, Set<string>> = {};
  const products: VaultProduct[] = [];

  for (const f of visible) {
    if (f.length >= 2) {
      groupSet.add(f[0]);
      if (f.length >= 3) (subs[f[0]] ??= new Set()).add(f.slice(1, -1).join(' / '));
    }
  }

  for (const path of visible) {
    const file = path[path.length - 1];
    if (extOf(file) !== 'md' || file.startsWith('_')) continue;
    const dir = path.slice(0, -1);
    const parsed = parseProductText(await readText(path));
    const base = baseOf(file);

    let imagePath: string[] | null = null;
    if (parsed.image && fileSet.has(key([...dir, parsed.image]))) imagePath = [...dir, parsed.image];
    if (!imagePath) {
      for (const ext of IMAGE_EXTS) {
        const cand = [...dir, `${base}.${ext}`];
        if (fileSet.has(key(cand))) {
          imagePath = cand;
          break;
        }
        // case-insensitive extension (e.g. .JPG from a phone)
        const upper = [...dir, `${base}.${ext.toUpperCase()}`];
        if (fileSet.has(key(upper))) {
          imagePath = upper;
          break;
        }
      }
    }

    products.push({
      name: base,
      group: dir.length >= 1 ? dir[0] : null,
      sub: dir.length >= 2 ? dir.slice(1).join(' / ') : null,
      price_cents: parsed.price_cents,
      promo_qty: parsed.promo_qty,
      promo_price_cents: parsed.promo_price_cents,
      sort_order: parsed.order,
      path,
      imagePath,
    });
  }

  // Group order: _orden.md first (if present), the rest alphabetical.
  let ordered: string[] = [];
  if (fileSet.has(ORDER_FILE)) {
    const text = (await readText([ORDER_FILE])).replace(/\r\n?/g, '\n');
    ordered = text
      .split('\n')
      .map((l) => l.match(/^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/)?.[1])
      .filter((x): x is string => !!x && groupSet.has(x));
  }
  const rest = [...groupSet].filter((g) => !ordered.includes(g)).sort((a, b) => a.localeCompare(b, 'es'));

  return {
    groups: [...ordered, ...rest],
    subs: Object.fromEntries(
      Object.entries(subs).map(([g, set]) => [g, [...set].sort((a, b) => a.localeCompare(b, 'es'))]),
    ),
    products: products.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

// ----------------------------------------------------------------- export

function uniquePath(used: Set<string>, dir: string[], base: string, ext: string) {
  let name = `${base}.${ext}`;
  let n = 2;
  while (used.has(key([...dir, name]).toLowerCase())) name = `${base} (${n++}).${ext}`;
  used.add(key([...dir, name]).toLowerCase());
  return name;
}

function imageExt(uri: string) {
  const clean = uri.split('?')[0];
  const mime = clean.match(/^data:image\/(\w+)/)?.[1];
  const e = mime ?? extOf(clean);
  return IMAGE_EXTS.includes(e) ? (e === 'jpeg' ? 'jpg' : e) : 'jpg';
}

/** Decides every file the folder should contain for the current app data. */
export function planExport(data: ExportInput): ExportPlan {
  const used = new Set<string>();
  const plan: ExportPlan = { files: [], images: [] };
  const groupName = new Map(data.groups.map((g) => [g.id, safeName(g.name)]));
  const subName = new Map(data.subcategories.map((s) => [s.id, safeName(s.name)]));
  const withProducts = new Set<string>();

  for (const p of data.products) {
    const dir: string[] = [];
    const g = p.group_id != null ? groupName.get(p.group_id) : undefined;
    if (g) {
      dir.push(g);
      const s = p.subcategory_id != null ? subName.get(p.subcategory_id) : undefined;
      if (s) dir.push(s);
    }
    withProducts.add(key(dir));
    const base = safeName(p.name);
    const mdName = uniquePath(used, dir, base, 'md');
    const mdBase = baseOf(mdName);

    let imageName: string | null = null;
    if (p.image_uri) {
      imageName = `${mdBase}.${imageExt(p.image_uri)}`;
      used.add(key([...dir, imageName]).toLowerCase());
      plan.images.push({ path: [...dir, imageName], productId: p.id, source: p.image_uri });
    }
    plan.files.push({
      path: [...dir, mdName],
      kind: 'product',
      text: serializeProduct({
        price_cents: p.price_cents,
        promo_qty: p.promo_qty,
        promo_price_cents: p.promo_price_cents,
        imageName,
        order: p.sort_order,
      }),
    });
  }

  // Empty groups/subcategories need a file, otherwise the folder would not exist.
  for (const g of data.groups) {
    const gn = safeName(g.name);
    const subsOfG = data.subcategories.filter((s) => s.group_id === g.id);
    for (const s of subsOfG) {
      const d = [gn, safeName(s.name)];
      if (!withProducts.has(key(d))) {
        plan.files.push({ path: [...d, PLACEHOLDER_FILE], text: placeholderText(), kind: 'meta' });
      }
    }
    const hasAnything = [...withProducts].some((d) => d === gn || d.startsWith(`${gn}/`)) ||
      subsOfG.length > 0;
    if (!hasAnything) plan.files.push({ path: [gn, PLACEHOLDER_FILE], text: placeholderText(), kind: 'meta' });
  }

  plan.files.push({ kind: 'meta', path: ['_LEEME.md'], text: README_TEXT });
  plan.files.push({
    kind: 'meta',
    path: [ORDER_FILE],
    text: ['# Orden de los grupos', '', ...data.groups.map((g, i) => `${i + 1}. ${safeName(g.name)}`), ''].join('\n'),
  });
  return plan;
}

const README_TEXT = [
  '# Carpeta Bakery',
  '',
  'Esta carpeta es el catálogo de la panadería. La app la lee y la mantiene al día.',
  '',
  '- Cada **carpeta** es un grupo; una **subcarpeta** es una subcategoría.',
  '- Cada **archivo .md** es un producto. El nombre del archivo es el nombre del producto.',
  '- La **foto** va junto al producto con el mismo nombre (Pan.md + Pan.jpg).',
  '',
  'Ejemplo de producto:',
  '',
  '```',
  '---',
  'precio: 2500',
  'promo_cantidad: 3',
  'promo_precio: 6000',
  'orden: 12',
  '---',
  'Aquí puedes escribir tus notas libremente.',
  '```',
  '',
  '`orden` es la posición del producto en el catálogo (menor = primero). La app lo actualiza cuando mueves productos.',
  '',
  'Los archivos que empiezan por _ o . se ignoran. Las notas debajo del encabezado no se tocan.',
  'Para traer tus cambios a la app: ábrela, o pulsa Sincronizar ahora.',
  '',
].join('\n');

function placeholderText() {
  return 'Esta carpeta es un grupo de la panadería. Agrega aquí un archivo .md por producto.\n';
}

// ------------------------------------------------------------- signatures

const cmpName = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });

/**
 * Position of each item once sorted by hand-made order (items without one go last, by name).
 * Comparing positions instead of raw numbers means gaps (1, 5, 9) do not count as differences.
 */
function ranks<T>(items: T[], order: (t: T) => number | null, name: (t: T) => string): Map<T, number> {
  const sorted = items
    .slice()
    .sort((a, b) => (order(a) ?? Infinity) - (order(b) ?? Infinity) || cmpName(name(a), name(b)));
  return new Map(sorted.map((t, i) => [t, i]));
}

/** Order-independent description of a catalog, to know whether two sides differ. */
export function signatureOfModel(m: VaultModel): string {
  const rank = ranks(m.products, (p) => p.sort_order, (p) => p.name);
  const lines = [
    `ORDER|${m.groups.join('>')}`,
    ...m.groups.flatMap((g) => (m.subs[g] ?? []).map((s) => `S|${g}|${s}`)),
    ...m.products.map(
      (p) =>
        `P|${p.group ?? ''}|${p.sub ?? ''}|${p.name}|${p.price_cents}|${p.promo_qty ?? ''}|${p.promo_price_cents ?? ''}|${p.imagePath ? 1 : 0}|${rank.get(p)}`,
    ),
  ];
  return lines.sort().join('\n');
}

/** Same signature, computed from app data. */
export function signatureOfApp(data: ExportInput): string {
  const groupName = new Map(data.groups.map((g) => [g.id, safeName(g.name)]));
  const subName = new Map(data.subcategories.map((s) => [s.id, safeName(s.name)]));
  const rank = ranks(data.products, (p) => p.sort_order, (p) => safeName(p.name));
  const lines = [
    `ORDER|${data.groups.map((g) => safeName(g.name)).join('>')}`,
    ...data.subcategories.map((s) => `S|${groupName.get(s.group_id) ?? ''}|${safeName(s.name)}`),
    ...data.products.map((p) => {
      const g = p.group_id != null ? groupName.get(p.group_id) ?? '' : '';
      const s = g && p.subcategory_id != null ? subName.get(p.subcategory_id) ?? '' : '';
      return `P|${g}|${s}|${safeName(p.name)}|${p.price_cents}|${p.promo_qty ?? ''}|${p.promo_price_cents ?? ''}|${p.image_uri ? 1 : 0}|${rank.get(p)}`;
    }),
  ];
  return lines.sort().join('\n');
}
