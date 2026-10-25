// Verifica un respaldo: integridad, importación real en la app y portadas por defecto.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/check_organized.ts <respaldo.json>
import fs from 'node:fs';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
(globalThis as any).localStorage = new MemStorage();

async function main() {
  const { coverFor } = require('../src/lib/cover') as typeof import('../src/lib/cover');
  const repo = require('../src/db/repo.web') as typeof import('../src/db/repo.web');
  const b = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  let bad = 0;
  const fail = (m: string) => {
    bad++;
    console.error('❌ ' + m);
  };

  const gById = new Map<number, any>(b.groups.map((g: any) => [g.id, g]));
  const sById = new Map<number, any>(b.subcategories.map((s: any) => [s.id, s]));
  for (const p of b.products) {
    if (p.group_id != null && !gById.has(p.group_id)) fail(`${p.name}: categoría inexistente`);
    if (p.subcategory_id != null) {
      const s = sById.get(p.subcategory_id);
      if (!s) fail(`${p.name}: subcategoría inexistente`);
      else if (s.group_id !== p.group_id) fail(`${p.name}: su subcategoría "${s.name}" no es de su categoría`);
    }
    if (!(p.price_cents > 0)) fail(`${p.name}: precio inválido`);
  }

  await repo.importAllData(b);
  const list = await repo.listProducts();
  if (list.length !== b.products.length) fail(`importación: ${list.length} de ${b.products.length}`);
  if (new Set(list.map((p) => p.sort_order)).size !== list.length) fail('posiciones de orden repetidas');
  const recent = list.slice().sort((a, c) => c.created_at - a.created_at || c.id - a.id);
  console.log(`✅ Importado: ${list.length} productos, ${(await repo.listGroups()).length} categorías, ${(await repo.listSubcategories()).length} subcategorías`);
  console.log(`✅ "Recientes" listaría ${recent.length} productos; el más nuevo: ${recent[0].name}; el más antiguo: ${recent[recent.length - 1].name}`);

  const withPhoto = list.filter((p) => p.image_uri).length;
  const dist: Record<string, number> = {};
  const generic: string[] = [];
  for (const p of list) {
    if (p.image_uri) continue;
    const c = coverFor(p.name, gById.get(p.group_id as number)?.name, sById.get(p.subcategory_id as number)?.name);
    dist[c.emoji] = (dist[c.emoji] ?? 0) + 1;
    if (c.emoji === '🛒') generic.push(p.name);
  }
  console.log(`\nCon foto propia: ${withPhoto} | Con portada automática: ${list.length - withPhoto}`);
  console.log('Portadas automáticas:', dist);
  console.log(`Con portada genérica 🛒 (${generic.length}): ${generic.join(' | ') || '—'}`);
  console.log(bad === 0 ? '\n✅ Respaldo consistente' : `\n❌ ${bad} problema(s)`);
  process.exit(bad === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
