// Portadas automáticas (emoji + color) cuando un producto no tiene foto.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_cover.ts
import { coverFor } from '../src/lib/cover';

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✅ ${msg}`);
  else {
    failures++;
    console.error(`❌ FALLÓ: ${msg}`);
  }
}
const e = (name: string, cat?: string, sub?: string) => coverFor(name, cat, sub).emoji;

console.log('--- TEST DE PORTADAS ---');
ok(e('Cerveza Poker') === '🍺' && e('Cerveza Club Colombia') === '🍺', 'cervezas 🍺');
ok(e('Leche colanta 200 ml') === '🥛' && e('Leche Colanta 5000') === '🥛', '"Leche colanta" es leche 🥛 (no gaseosa por "cola")');
ok(e('Alqueria Yogur') === '🥛' && e('Avena bolsa') === '🥛', 'yogur y avena 🥛');
ok(e('Cocacola en lata') === '🥤' && e('Coca Cola 400 ml') === '🥤' && e('Postobón manzana') === '🥤', 'gaseosas 🥤');
ok(e('Agua pequeña') === '💧' && e('Agua brisa saborizada') === '💧', 'agua 💧');
ok(e('Monster') === '⚡' && e('Red bull') === '⚡' && e('Powerade') === '⚡', 'energizantes ⚡');
ok(e('Malboro rojo') === '🚬' && e('LM') === '🚬' && e('Rothmans') === '🚬', 'cigarrillos 🚬');
ok(e('Cudiz') === '🍟', '"Cudiz" es un snack, no un cigarrillo');
ok(e('Almojábana') === '🥖' && e('Pan tradicional') === '🥖', 'panes 🥖');
ok(e('Croissant de queso') === '🥐', 'croissant 🥐');
ok(e('Empanada de carne') === '🥟', 'empanadas 🥟');
ok(e('Oreo') === '🍪' && e('Club social') === '🍪', 'galletas 🍪');
ok(e('Trident 5,1 g') === '🍬' && e('Frunas') === '🍬', 'chicles y dulces 🍬');
ok(e('Aguardiente amarillo') === '🥃', 'licor 🥃');
ok(e('Torta de chocolate') === '🍰', 'tortas 🍰');
ok(e('Doritos') === '🍟' && e('Choclitos picantes') === '🍟', 'papitas 🍟');
// sin pista en el nombre: se usa la categoría
ok(e('Producto raro', 'Cervezas') === '🍺' && e('Producto raro', 'Lácteos') === '🥛' && e('Producto raro', 'Tortas y Pastelería') === '🍰', 'sin pista en el nombre usa la categoría');
ok(e('Producto raro') === '🛒', 'sin pista ni categoría: portada genérica');
ok(/^#[0-9a-f]{6}$/i.test(coverFor('Pan').bg), 'siempre devuelve un color válido');

console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
process.exit(failures === 0 ? 0 : 1);
