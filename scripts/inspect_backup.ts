// Resumen de un respaldo .json frente al catálogo inicial.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/inspect_backup.ts <archivo.json>
import fs from 'node:fs';

import { INITIAL_CATALOG } from '../src/db/initialData';

const file = process.argv[2];
if (!file) {
  console.error('Falta el archivo .json');
  process.exit(1);
}
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const money = (c: number) => `$${(c / 100).toLocaleString('es-CO')}`;

const seed = new Map<string, any>();
for (const cat of INITIAL_CATALOG) for (const p of cat.products) seed.set(p.name.trim().toLowerCase(), { ...p, cat: cat.name });

const gname = new Map<number, string>(b.groups.map((g: any) => [g.id, g.name]));
const sname = new Map<number, string>(b.subcategories.map((s: any) => [s.id, s.name]));
const where = (p: any) => `${gname.get(p.group_id) ?? 'Sin categoría'}${p.subcategory_id ? ' › ' + sname.get(p.subcategory_id) : ''}`;

console.log(`Respaldo del: ${b.exported_at_readable}  (versión ${b.version})`);
console.log(`Categorías: ${b.groups.length} | Subcategorías: ${b.subcategories.length} | Productos: ${b.products.length} | Con foto: ${b.products.filter((p: any) => p.image_base64 || p.image_uri).length}`);
console.log(`Productos con ventas registradas: ${Object.keys(b.frequencies ?? {}).length}`);

const seedGroups = new Set(INITIAL_CATALOG.map((c) => c.name));
const newGroups = b.groups.filter((g: any) => !seedGroups.has(g.name)).map((g: any) => g.name);
console.log(`\nCategorías NUEVAS (${newGroups.length}): ${newGroups.join(', ') || '—'}`);

const added = b.products.filter((p: any) => !seed.has(p.name.trim().toLowerCase()));
console.log(`\nProductos NUEVOS (${added.length}):`);
for (const p of added) console.log(`  • ${p.name} — ${money(p.price_cents)} — ${where(p)}${p.image_base64 || p.image_uri ? ' 📷' : ''}${p.promo_qty ? ` [promo ${p.promo_qty}x${money(p.promo_price_cents)}]` : ''}`);

const changed = b.products.filter((p: any) => {
  const s = seed.get(p.name.trim().toLowerCase());
  return s && (s.price_cents !== p.price_cents || (s.promo_qty ?? null) !== (p.promo_qty ?? null));
});
console.log(`\nProductos del catálogo original con precio/promo CAMBIADOS (${changed.length}):`);
for (const p of changed) {
  const s = seed.get(p.name.trim().toLowerCase());
  console.log(`  • ${p.name}: ${money(s.price_cents)} → ${money(p.price_cents)}`);
}

const names = new Set(b.products.map((p: any) => p.name.trim().toLowerCase()));
const missing = [...seed.keys()].filter((n) => !names.has(n));
console.log(`\nProductos del catálogo original que YA NO están en el respaldo (${missing.length}): ${missing.slice(0, 15).join(', ')}${missing.length > 15 ? '…' : ''}`);
