// Runs the REAL Android data layer (src/db/client.ts + repo.ts) on Node's SQLite.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_native_db.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import * as shim from './shims/expo-sqlite';

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

/** Loads a brand-new copy of the data layer pointing at `file` (like a fresh app start). */
function boot(file: string) {
  shim.setDbFile(file);
  for (const k of Object.keys(require.cache)) {
    if (k.includes(`${path.sep}src${path.sep}db${path.sep}`)) delete require.cache[k];
  }
  return {
    repo: require('../src/db/repo') as typeof import('../src/db/repo'),
    client: require('../src/db/client') as typeof import('../src/db/client'),
  };
}

const tmp = (n: string) => path.join(os.tmpdir(), `bk-test-${process.pid}-${n}.db`);
const cleanup: string[] = [];

async function main() {
  console.log('--- TEST DE LA CAPA DE DATOS DE ANDROID (SQLite real) ---');
  for (const old of fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('bk-test-'))) {
    try {
      fs.rmSync(path.join(os.tmpdir(), old), { force: true });
    } catch {}
  }

  // 1. Arranque en frío: base nueva -> catálogo inicial
  {
    const f = tmp('fresh');
    cleanup.push(f);
    const t0 = Date.now();
    const { repo } = boot(f);
    await repo.seedInitialData(false);
    const ms = Date.now() - t0;
    const [g, s, p] = [await repo.listGroups(), await repo.listSubcategories(), await repo.listProducts()];
    ok(g.length === 8 && s.length === 23 && p.length === 113, `arranque en frío: ${g.length} categorías, ${s.length} subcategorías, ${p.length} productos`);
    ok(ms < 5000, `el arranque en frío tarda ${ms} ms (< 5 s)`);
    ok(p.every((x) => x.price_cents > 0), 'todos los productos iniciales tienen precio > 0');
    ok(p.filter((x) => x.promo_qty).length === 3, 'las 3 promociones iniciales se cargaron');
    const orphan = p.filter((x) => x.subcategory_id != null && !s.some((y) => y.id === x.subcategory_id));
    ok(orphan.length === 0, 'ninguna subcategoría de producto apunta a algo inexistente');
  }

  // 2. Sembrar dos veces a la vez no duplica el catálogo (dos recargas rápidas)
  {
    const f = tmp('race');
    cleanup.push(f);
    const { repo } = boot(f);
    await Promise.all([repo.seedInitialData(false), repo.seedInitialData(false), repo.seedInitialData(false)]);
    ok((await repo.listProducts()).length === 113, 'tres arranques simultáneos no duplican el catálogo (113)');
  }

  // 3. Actualizar desde la primera versión de la app (sin subcategorías ni promociones)
  {
    const f = tmp('legacy');
    cleanup.push(f);
    const old = new DatabaseSync(f);
    old.exec(`
      CREATE TABLE groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price_cents INTEGER NOT NULL DEFAULT 0,
        image_uri TEXT, group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL, created_at INTEGER NOT NULL);
      INSERT INTO groups (name, sort_order) VALUES ('Panes', 1);
      INSERT INTO products (name, price_cents, image_uri, group_id, created_at) VALUES ('Pan viejo', 150000, 'file:///x.jpg', 1, 1);
    `);
    old.close();
    const { repo } = boot(f);
    await repo.seedInitialData(false); // no debe pisar datos existentes
    const p = await repo.listProducts();
    ok(p.length === 1 && p[0].name === 'Pan viejo', 'actualizar desde la versión 1 conserva los productos existentes');
    ok(p[0].image_uri === 'file:///x.jpg' && p[0].price_cents === 150000, 'conserva foto y precio');
    ok('promo_qty' in p[0] && 'subcategory_id' in p[0], 'agrega las columnas nuevas (promo y subcategoría)');
    await repo.saveProduct({ name: 'Nuevo', price_cents: 100, image_uri: null, group_id: 1, subcategory_id: null, promo_qty: 3, promo_price_cents: 200 });
    ok((await repo.listProducts()).length === 2, 'se puede guardar después de migrar');
    // abrir otra vez no rompe (migración idempotente)
    const again = boot(f);
    ok((await again.repo.listProducts()).length === 2, 'reabrir la base migrada funciona');
  }

  // 4. Categorías y subcategorías: crear, duplicados, renombrar, borrar
  {
    const f = tmp('crud');
    cleanup.push(f);
    const { repo } = boot(f);
    await repo.seedInitialData(false);
    const n0 = (await repo.listGroups()).length;
    const a = await repo.addGroup('ZZ_TEST Grupo A');
    const a2 = await repo.addGroup('  zz_test   grupo a ');
    ok(a === a2 && (await repo.listGroups()).length === n0 + 1, 'un nombre repetido (otra mayúscula/espacios) no crea otro grupo');
    const b = await repo.addGroup('ZZ_TEST Grupo B');
    const dupErr = await throws(() => repo.renameGroup(b, 'zz_test grupo a'));
    ok(dupErr === 'DUPLICATE_NAME', 'renombrar a un nombre existente es rechazado');
    await repo.renameGroup(b, 'ZZ_TEST Grupo B2');
    ok((await repo.listGroups()).some((g) => g.name === 'ZZ_TEST Grupo B2'), 'renombrar funciona');
    await repo.renameGroup(a, 'ZZ_TEST GRUPO A'); // mismo nombre con otro formato en el MISMO grupo: permitido
    ok(true, 'cambiar solo mayúsculas del propio grupo es válido');

    const s1 = await repo.addSubcategory(a, 'ZZ_TEST Sub 1');
    const s1b = await repo.addSubcategory(a, 'zz_test sub 1');
    const s2 = await repo.addSubcategory(b, 'ZZ_TEST Sub 1'); // mismo nombre en otro grupo: permitido
    ok(s1 === s1b && s1 !== s2, 'subcategoría repetida se une dentro del grupo, pero se permite en otro grupo');
    ok((await throws(() => repo.renameSubcategory(s1, 'ZZ_TEST Sub 1'))) === null, 'renombrar una subcategoría a su propio nombre es válido');

    // productos
    await repo.saveProduct({ name: 'ZZ_TEST P1', price_cents: 250000, image_uri: null, group_id: a, subcategory_id: s1, promo_qty: 3, promo_price_cents: 600000 });
    await repo.addProductsBulk([{ name: 'ZZ_TEST B1', price_cents: 100000 }, { name: 'ZZ_TEST B2', price_cents: 200000 }], b);
    let prods = (await repo.listProducts()).filter((p) => p.name.startsWith('ZZ_TEST'));
    ok(prods.length === 3, 'producto + carga masiva crean 3 productos de prueba');
    const p1 = prods.find((p) => p.name === 'ZZ_TEST P1')!;
    ok(p1.group_id === a && p1.subcategory_id === s1 && p1.promo_qty === 3 && p1.promo_price_cents === 600000, 'el producto guarda grupo, subcategoría y promoción');

    // editar
    await repo.saveProduct({ ...p1, name: 'ZZ_TEST P1 editado', price_cents: 300000, promo_qty: null, promo_price_cents: null }, p1.id);
    const edited = await repo.getProduct(p1.id);
    ok(edited!.name === 'ZZ_TEST P1 editado' && edited!.price_cents === 300000 && edited!.promo_qty === null, 'editar cambia nombre/precio y quita la promoción');

    // venta -> frecuentes
    await repo.recordSale({ [p1.id]: 3 });
    await repo.recordSale({ [p1.id]: 2 });
    const freq = await repo.getFrequentProductIds();
    ok(freq[0]?.product_id === p1.id && freq[0].count === 5, 'dos ventas acumulan la frecuencia (3 + 2 = 5)');

    // borrar subcategoría: productos quedan sin subcategoría pero conservan grupo
    await repo.deleteSubcategory(s1);
    const afterSub = await repo.getProduct(p1.id);
    ok(afterSub!.subcategory_id === null && afterSub!.group_id === a, 'borrar subcategoría deja el producto en su grupo, sin subcategoría');

    // borrar grupo: productos pasan a sin categoría, subcategorías desaparecen
    await repo.saveProduct({ ...afterSub!, subcategory_id: s2 }, p1.id); // (s2 es de B; solo para probar la cascada)
    await repo.deleteGroup(b);
    prods = (await repo.listProducts()).filter((p) => p.name.startsWith('ZZ_TEST'));
    ok(prods.every((p) => p.group_id !== b), 'borrar el grupo B deja sus productos sin categoría');
    ok(!(await repo.listSubcategories()).some((s) => s.group_id === b), 'borrar el grupo borra sus subcategorías');
    ok(prods.filter((p) => p.name.startsWith('ZZ_TEST B')).every((p) => p.group_id === null && p.subcategory_id === null), 'los productos del grupo borrado quedan limpios (sin grupo ni subcategoría)');

    // borrar producto: también su estadística
    await repo.deleteProduct(p1.id);
    ok((await repo.getFrequentProductIds()).every((x) => x.product_id !== p1.id), 'borrar un producto elimina su frecuencia');

    // limpiar y comprobar que el catálogo original quedó intacto
    for (const p of (await repo.listProducts()).filter((x) => x.name.startsWith('ZZ_TEST'))) await repo.deleteProduct(p.id);
    await repo.deleteGroup(a);
    ok((await repo.listProducts()).length === 113 && (await repo.listGroups()).length === n0, 'tras borrar lo de prueba el catálogo vuelve a 113 productos y 8 categorías');
  }

  // 5. Exportar -> importar (respaldo) conserva todo
  {
    const f = tmp('backup');
    cleanup.push(f);
    const { repo } = boot(f);
    await repo.seedInitialData(false);
    const prods = await repo.listProducts();
    await repo.recordSale({ [prods[0].id]: 4, [prods[1].id]: 1 });
    const dump = await repo.exportAllData();
    const f2 = tmp('backup2');
    cleanup.push(f2);
    const other = boot(f2);
    await other.repo.seedInitialData(false);
    await other.repo.importAllData(dump);
    const back = await other.repo.exportAllData();
    ok(back.products.length === dump.products.length && back.groups.length === dump.groups.length && back.subcategories.length === dump.subcategories.length, 'respaldo e importación conservan categorías, subcategorías y productos');
    ok(JSON.stringify(back.frequencies) === JSON.stringify(dump.frequencies), 'respaldo e importación conservan las frecuencias');
    ok(back.products.every((p, i) => p.name === dump.products[i].name && p.price_cents === dump.products[i].price_cents), 'precios y nombres idénticos tras importar');
  }

  // 6. Restaurar catálogo (force) deja todo limpio, sin estadísticas viejas
  {
    const f = tmp('force');
    cleanup.push(f);
    const { repo } = boot(f);
    await repo.seedInitialData(false);
    const p = await repo.listProducts();
    await repo.recordSale({ [p[0].id]: 2 });
    await repo.addGroup('ZZ_TEST borrar');
    await repo.seedInitialData(true);
    ok((await repo.listProducts()).length === 113 && (await repo.listGroups()).length === 8, 'restaurar catálogo vuelve a 113 productos y 8 categorías');
    ok((await repo.getFrequentProductIds()).length === 0, 'restaurar catálogo limpia las frecuencias viejas');
  }

  // 7. Si abrir la base falla una vez, el siguiente intento ("Reintentar") funciona
  {
    const f = tmp('retry');
    cleanup.push(f);
    const { repo } = boot(f);
    shim.hooks.failOpens = 1;
    const first = await throws(() => repo.listGroups());
    const second = await throws(() => repo.seedInitialData(false));
    ok(first === 'disco lleno', 'el primer intento falla con el error real (no se queda colgado)');
    ok(second === null && (await repo.listProducts()).length === 113, 'el segundo intento funciona (el fallo no queda guardado)');
  }

  // Windows keeps the files locked while this process is alive; leftovers are removed on the next run.
  for (const f of cleanup) for (const x of [f, `${f}-wal`, `${f}-shm`]) {
    try {
      fs.rmSync(x, { force: true });
    } catch {}
  }
  console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
