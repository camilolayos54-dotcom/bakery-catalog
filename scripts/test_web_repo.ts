// Almacenamiento web/Windows (localStorage): mismas reglas que Android.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_web_repo.ts
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

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✅ ${msg}`);
  else {
    failures++;
    console.error(`❌ FALLÓ: ${msg}`);
  }
}
async function throws(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (e: any) {
    return String(e?.message ?? e);
  }
}

async function main() {
  const repo = require('../src/db/repo.web') as typeof import('../src/db/repo.web');
  console.log('--- TEST DEL ALMACENAMIENTO WEB ---');

  await repo.seedInitialData(false);
  const [g0, s0, p0] = [await repo.listGroups(), await repo.listSubcategories(), await repo.listProducts()];
  ok(g0.length === 10 && s0.length === 25 && p0.length === 192, `primer arranque: ${g0.length} categorías, ${s0.length} subcategorías, ${p0.length} productos`);
  ok(p0.filter((x) => x.image_uri).length === 35, 'las 35 fotos vienen incluidas');
  ok(p0.some((x) => /cocas?cola/i.test(x.name)), 'el catálogo incluye Coca Cola');
  await repo.seedInitialData(false);
  ok((await repo.listProducts()).length === 192, 'arrancar otra vez no duplica el catálogo');

  const a = await repo.addGroup('ZZ_TEST Grupo A');
  ok((await repo.addGroup(' zz_test  GRUPO a ')) === a && (await repo.listGroups()).length === 11, 'grupo repetido (otra mayúscula/espacios) no se duplica');
  const b = await repo.addGroup('ZZ_TEST Grupo B');
  ok((await throws(() => repo.renameGroup(b, 'zz_test grupo a'))) === 'DUPLICATE_NAME', 'renombrar a un nombre existente es rechazado');
  await repo.renameGroup(b, 'ZZ_TEST Grupo B2');
  ok((await repo.listGroups()).some((g) => g.name === 'ZZ_TEST Grupo B2'), 'renombrar funciona');

  const s1 = await repo.addSubcategory(a, 'ZZ_TEST Sub 1');
  ok((await repo.addSubcategory(a, 'zz_test sub 1')) === s1, 'subcategoría repetida dentro del grupo se une');
  const s2 = await repo.addSubcategory(b, 'ZZ_TEST Sub 1');
  ok(s2 !== s1, 'el mismo nombre en otro grupo es válido');
  ok((await throws(() => repo.renameSubcategory(s1, 'ZZ_TEST Sub 1'))) === null, 'renombrar a su propio nombre es válido');

  await repo.saveProduct({ name: 'ZZ_TEST P1', price_cents: 250000, image_uri: null, group_id: a, subcategory_id: s1, promo_qty: 3, promo_price_cents: 600000 });
  await repo.addProductsBulk([{ name: 'ZZ_TEST B1', price_cents: 100000 }, { name: 'ZZ_TEST B2', price_cents: 200000 }], b);
  let test = (await repo.listProducts()).filter((p) => p.name.startsWith('ZZ_TEST'));
  const p1 = test.find((p) => p.name === 'ZZ_TEST P1')!;
  ok(test.length === 3 && p1.group_id === a && p1.subcategory_id === s1 && p1.promo_qty === 3, 'producto y carga masiva se guardan con grupo, subcategoría y promoción');

  await repo.saveProduct({ ...p1, name: 'ZZ_TEST P1 editado', price_cents: 300000, promo_qty: null, promo_price_cents: null }, p1.id);
  const ed = await repo.getProduct(p1.id);
  ok(ed!.name === 'ZZ_TEST P1 editado' && ed!.price_cents === 300000 && ed!.promo_qty === null, 'editar cambia precio y quita la promoción');

  await repo.recordSale({ [p1.id]: 3 });
  await repo.recordSale({ [p1.id]: 2 });
  const fr = await repo.getFrequentProductIds();
  ok(fr[0].product_id === p1.id && fr[0].count === 5, 'frecuencias acumuladas (3 + 2 = 5)');

  await repo.deleteSubcategory(s1);
  const afterSub = await repo.getProduct(p1.id);
  ok(afterSub!.subcategory_id === null && afterSub!.group_id === a, 'borrar subcategoría deja el producto en su grupo');

  await repo.deleteGroup(b);
  test = (await repo.listProducts()).filter((p) => p.name.startsWith('ZZ_TEST B'));
  ok(test.length === 2 && test.every((p) => p.group_id === null && p.subcategory_id === null), 'borrar grupo deja sus productos sin categoría ni subcategoría');
  ok(!(await repo.listSubcategories()).some((s) => s.group_id === b), 'borrar grupo borra sus subcategorías');

  await repo.deleteProduct(p1.id);
  ok((await repo.getFrequentProductIds()).every((x) => x.product_id !== p1.id), 'borrar un producto elimina su frecuencia');

  // respaldo
  const dump = await repo.exportAllData();
  (globalThis as any).localStorage.clear();
  await repo.importAllData(dump);
  const back = await repo.exportAllData();
  ok(back.products.length === dump.products.length && back.groups.length === dump.groups.length, 'exportar → importar conserva productos y categorías');
  ok(JSON.stringify(back.frequencies) === JSON.stringify(dump.frequencies), 'exportar → importar conserva frecuencias');

  // limpieza y comparación con el catálogo original
  for (const p of (await repo.listProducts()).filter((x) => x.name.startsWith('ZZ_TEST'))) await repo.deleteProduct(p.id);
  await repo.deleteGroup(a);
  ok((await repo.listProducts()).length === 192 && (await repo.listGroups()).length === 10, 'tras borrar lo de prueba vuelve a 192 productos y 10 categorías');

  await repo.recordSale({ [(await repo.listProducts())[0].id]: 2 });
  await repo.seedInitialData(true);
  ok((await repo.listProducts()).length === 192 && (await repo.getFrequentProductIds()).length === 0, 'restaurar catálogo: 192 productos y sin frecuencias viejas');

  // ---- Orden personalizado
  const ls = (globalThis as any).localStorage;
  ls.clear();
  ls.setItem(
    'bakery-catalog-v5',
    JSON.stringify({
      groups: [{ id: 1, name: 'G', sort_order: 1 }],
      subcategories: [],
      products: ['pera', 'Banano', 'manzana', 'Anís'].map((name, i) => ({ id: i + 1, name, price_cents: 100, image_uri: null, group_id: 1, subcategory_id: null, created_at: 1, promo_qty: null, promo_price_cents: null })),
      nextGroupId: 2, nextSubcategoryId: 1, nextProductId: 5, frequencies: {},
    }),
  );
  const legacy = await repo.listProducts();
  ok(legacy.map((p) => p.name).join(',') === 'Anís,Banano,manzana,pera' && legacy.map((p) => p.sort_order).join(',') === '1,2,3,4', 'datos viejos del navegador (sin orden) pasan a orden alfabético 1..n');

  ls.clear();
  await repo.seedInitialData(false);
  const all = await repo.listProducts();
  ok(new Set(all.map((p) => p.sort_order)).size === 192 && all[0].sort_order === 1 && all[191].sort_order === 193, 'catálogo inicial: 192 posiciones únicas (1..193)');
  const grp = (await repo.listGroups())[0];
  const ids = all.filter((p) => p.group_id === grp.id).map((p) => p.id);
  const moved = ids.slice();
  moved.unshift(moved.pop()!);
  await repo.reorderProducts(moved);
  const after = await repo.listProducts();
  ok(after.filter((p) => p.group_id === grp.id).map((p) => p.id).join(',') === moved.join(','), 'mover el último de una categoría al inicio funciona');
  const others = (l: typeof all) => l.filter((p) => p.group_id !== grp.id).map((p) => p.id).join(',');
  ok(others(after) === others(all) && new Set(after.map((p) => p.sort_order)).size === 192, 'otras categorías no se mueven y las posiciones siguen únicas');
  await repo.saveProduct({ name: 'AAA nuevo', price_cents: 100, image_uri: null, group_id: null, subcategory_id: null, promo_qty: null, promo_price_cents: null });
  await repo.addProductsBulk([{ name: 'AAA bulk 1', price_cents: 100 }, { name: 'AAA bulk 2', price_cents: 100 }], null);
  ok((await repo.listProducts()).slice(-3).map((p) => p.name).join('|') === 'AAA nuevo|AAA bulk 1|AAA bulk 2', 'productos nuevos quedan al final en el orden en que se agregan');
  const dump2 = await repo.exportAllData();
  ls.clear();
  await repo.importAllData(dump2);
  ok((await repo.listProducts()).map((p) => p.id).join(',') === (dump2.products.slice().sort((a, b) => a.sort_order - b.sort_order).map((p) => p.id).join(',')), 'exportar → importar conserva el orden personalizado');
  const oldDump = JSON.parse(JSON.stringify(dump2));
  oldDump.products.forEach((p: any) => delete p.sort_order);
  ls.clear();
  await repo.importAllData(oldDump);
  ok(new Set((await repo.listProducts()).map((p) => p.sort_order)).size === oldDump.products.length, 'un respaldo antiguo (sin orden) se importa con posiciones únicas');
  ok((await throws(() => repo.reorderProducts([]))) === null && (await throws(() => repo.reorderProducts([all[0].id]))) === null, 'reordenar una lista vacía o de un producto no falla');

  console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
