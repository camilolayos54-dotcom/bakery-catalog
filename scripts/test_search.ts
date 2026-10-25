// Búsqueda tolerante de productos.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_search.ts
import fs from 'node:fs';

import { makeMatcher, matchesQuery } from '../src/lib/search';

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

console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
process.exit(failures === 0 ? 0 : 1);
