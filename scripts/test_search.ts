// Búsqueda tolerante de productos.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_search.ts
import fs from 'node:fs';

import { INITIAL_CATALOG } from '../src/db/initialData';
import { makeHaystack, makeHaystackMatcher, makeMatcher, matchesQuery } from '../src/lib/search';

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✅ ${msg}`);
  else {
    failures++;
    console.error(`❌ FALLÓ: ${msg}`);
  }
}

console.log('--- TEST DE BÚSQUEDA ---');
ok(matchesQuery('coca cola', 'Cocacola 400 ml'), '"coca cola" encuentra "Cocacola 400 ml" (con espacio vs sin espacio)');
ok(matchesQuery('cocacola', 'Coca Cola en lata'), '"cocacola" encuentra "Coca Cola en lata"');
ok(matchesQuery('coca-cola', 'Cocacola vidrio 237'), '"coca-cola" con guion también');
ok(matchesQuery('COCA', 'cocacola litro y medio 8500'), 'ignora mayúsculas');
ok(matchesQuery('almojabana', 'Almojábana') && matchesQuery('almojábana', 'Almojabana'), 'ignora tildes en ambos sentidos');
ok(matchesQuery('pan bono', 'Pan de bono'), 'palabras sueltas en orden: "pan bono" encuentra "Pan de bono"');
ok(matchesQuery('bono pan', 'Pan de bono'), 'palabras en cualquier orden');
ok(matchesQuery('gaseosa', 'Refajo', 'Gaseosas y Maltas'), 'también busca en el nombre de la categoría');
ok(matchesQuery('leche colanta', 'Leche Colanta 5000'), 'varias palabras');
ok(!matchesQuery('coca cola', 'Cerveza Poker'), 'no devuelve productos que no tienen que ver');
ok(!matchesQuery('pan bono', 'Pan agridulce'), 'todas las palabras deben estar');
ok(makeMatcher('')('lo que sea') && makeMatcher('   ')('lo que sea'), 'búsqueda vacía muestra todo');
ok(matchesQuery('1.5', 'Premio 1.5') && matchesQuery('400ml', 'Del valle 400 ml'), 'números y medidas ("400ml" encuentra "400 ml")');
ok(!matchesQuery('xyz', 'Cocacola'), 'texto sin relación no coincide');

// Con tu respaldo real (si está en la carpeta)
const backup = 'panaderia_respaldo_organizado.json';
if (fs.existsSync(backup)) {
  const b = JSON.parse(fs.readFileSync(backup, 'utf8'));
  const gname = new Map<number, string>(b.groups.map((g: any) => [g.id, g.name]));
  const sname = new Map<number, string>(b.subcategories.map((s: any) => [s.id, s.name]));
  const find = (q: string) => {
    const m = makeMatcher(q);
    return b.products.filter((p: any) => m(p.name, gname.get(p.group_id), sname.get(p.subcategory_id))).map((p: any) => p.name);
  };
  const coca = find('coca cola');
  console.log('   "coca cola" ->', coca.join(' | '));
  ok(coca.length >= 3 && coca.every((n: string) => /coca/i.test(n)), `en tu respaldo "coca cola" encuentra ${coca.length} productos, todos Coca-Cola`);
  ok(find('colanta').some((n: string) => /leche/i.test(n)), 'en tu respaldo "colanta" encuentra la leche');
}

// ---- Escritura rápida: cada letra que se teclea (simula dedos rápidos en el celular) ----
{
  const all = INITIAL_CATALOG.flatMap((c) => c.products.map((p) => ({ name: p.name, cat: c.name, sub: p.subcategory ?? null })));
  const index = all.map((p) => makeHaystack(p.name, p.cat, p.sub));
  const find = (q: string) => all.filter((_, i) => makeHaystackMatcher(q)(index[i])).map((p) => p.name);

  // 1. Cada prefijo del nombre (lo que ves mientras escribes) siempre encuentra el producto.
  let missed = '';
  for (const p of all) for (let n = 1; n <= p.name.length && !missed; n++) {
    const typed = p.name.slice(0, n);
    if (!find(typed).includes(p.name)) missed = `"${typed}" no encuentra "${p.name}"`;
  }
  ok(!missed, `escribiendo letra por letra, cada prefijo de los ${all.length} productos lo encuentra${missed ? ' — ' + missed : ''}`);

  // 2. Escribir sin tildes, en mayúsculas o con espacios de más da lo mismo.
  let sloppy = '';
  for (const p of all) {
    const bare = p.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    for (const typed of [bare, `  ${bare}  `, bare.replace(/ /g, '')]) if (!find(typed).includes(p.name)) sloppy = `"${typed}" no encuentra "${p.name}"`;
  }
  ok(!sloppy, `mayúsculas, sin tildes, espacios de más o sin espacios: todos se encuentran${sloppy ? ' — ' + sloppy : ''}`);

  // 3. Si se teclean las letras desordenadas por palabras ("bono pan") igual aparece.
  ok(find('bono pan').some((n) => /pan de bono/i.test(n)) || find('pan bono').length === find('bono pan').length, 'el orden de las palabras no importa');

  // 4. Una búsqueda que no existe no devuelve nada y una más larga nunca agrega resultados.
  ok(find('zzzqqq').length === 0, 'una búsqueda inexistente no devuelve nada');
  let grew = '';
  for (const p of all.slice(0, 60)) {
    let prev = all.length;
    for (let n = 1; n <= p.name.length; n++) {
      const c = find(p.name.slice(0, n)).length;
      if (c > prev) grew = `"${p.name.slice(0, n)}"`;
      prev = c;
    }
  }
  ok(!grew, `escribir una letra más nunca agrega resultados${grew ? ' — ' + grew : ''}`);

  // 5. Velocidad: 8 letras seguidas sobre el catálogo completo, repetido 50 veces (ráfagas rápidas).
  const t0 = performance.now();
  for (let r = 0; r < 50; r++) for (const q of ['c', 'co', 'coc', 'coca', 'coca ', 'coca c', 'coca co', 'coca col']) find(q);
  const per = (performance.now() - t0) / (50 * 8);
  ok(per < 2, `cada pulsación filtra ${all.length} productos en ${per.toFixed(3)} ms (< 2 ms)`);
  // El índice se arma una sola vez: sin índice (lo de antes) sale más caro.
  const t1 = performance.now();
  for (let r = 0; r < 50; r++) for (const q of ['c', 'co', 'coc', 'coca']) all.forEach((p) => makeMatcher(q)(p.name, p.cat, p.sub));
  const old = (performance.now() - t1) / (50 * 4);
  console.log(`   con índice ${per.toFixed(3)} ms vs sin índice ${old.toFixed(3)} ms por pulsación`);
}

console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
process.exit(failures === 0 ? 0 : 1);
