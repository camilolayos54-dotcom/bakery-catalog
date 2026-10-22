// Orden personalizado de productos (lógica pura).
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_order.ts
import { alphabeticalOrder, assignOrder, byCustomOrder, moveBy, moveToIndex } from '../src/lib/order';

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✅ ${msg}`);
  else {
    failures++;
    console.error(`❌ FALLÓ: ${msg}`);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log('--- TEST DEL ORDEN PERSONALIZADO ---');

// moveToIndex / moveBy
ok(eq(moveToIndex([1, 2, 3, 4], 4, 0), [4, 1, 2, 3]), 'mover el último al inicio');
ok(eq(moveToIndex([1, 2, 3, 4], 1, 3), [2, 3, 4, 1]), 'mover el primero al final');
ok(eq(moveToIndex([1, 2, 3, 4], 2, 2), [1, 3, 2, 4]), 'mover al medio');
ok(eq(moveToIndex([1, 2, 3], 2, 99), [1, 3, 2]) && eq(moveToIndex([1, 2, 3], 2, -5), [2, 1, 3]), 'una posición fuera de rango se ajusta al borde');
ok(eq(moveToIndex([1, 2, 3], 9, 0), [1, 2, 3]), 'mover un id que no está en la lista no cambia nada');
ok(eq(moveBy([1, 2, 3], 2, -1), [2, 1, 3]) && eq(moveBy([1, 2, 3], 2, 1), [1, 3, 2]), 'un paso antes / después');
ok(eq(moveBy([1, 2, 3], 1, -1), [1, 2, 3]) && eq(moveBy([1, 2, 3], 3, 1), [1, 2, 3]), 'en los extremos un paso no hace nada');

// assignOrder: reparte los números que ya tenían, en el nuevo orden
const cur = [
  { id: 1, sort_order: 10 },
  { id: 2, sort_order: 20 },
  { id: 3, sort_order: 30 },
  { id: 4, sort_order: 40 },
];
let got = assignOrder([3, 1, 2], cur.slice(0, 3));
ok(got.get(3) === 10 && got.get(1) === 20 && got.get(2) === 30, 'reordenar 3 productos reparte sus mismos números (10, 20, 30)');
ok(!got.has(4), 'los productos que no están en la lista no se tocan');
got = assignOrder([2, 4], [cur[1], cur[3]]); // lista filtrada: 2 y 4 intercambian lugares, 1 y 3 quedan igual
ok(got.get(2) === 20 && got.get(4) === 40, 'dos productos ya en orden conservan su lugar');
got = assignOrder([4, 2], [cur[1], cur[3]]);
ok(got.get(4) === 20 && got.get(2) === 40, 'intercambiar dos productos de una lista filtrada usa solo sus números');
const all = [...cur];
const swap = assignOrder([4, 2], [cur[1], cur[3]]);
const after = all.map((c) => ({ ...c, sort_order: swap.get(c.id) ?? c.sort_order })).sort((a, b) => a.sort_order - b.sort_order).map((c) => c.id);
ok(eq(after, [1, 4, 3, 2]), 'los productos fuera de la lista (1 y 3) siguen en su sitio (resultado 1,4,3,2)');
got = assignOrder([2, 1, 3], [{ id: 1, sort_order: 0 }, { id: 2, sort_order: 0 }, { id: 3, sort_order: 0 }]);
ok(new Set(got.values()).size === 3 && got.get(2)! < got.get(1)! && got.get(1)! < got.get(3)!, 'si todos tenían el mismo número se vuelven distintos y respetan el orden');
ok(assignOrder([9], [{ id: 1, sort_order: 1 }]).size === 0, 'ids desconocidos se ignoran');

// alfabético y orden final
const names = [
  { id: 1, name: 'pan' },
  { id: 2, name: 'Almojábana' },
  { id: 3, name: 'Brownie' },
  { id: 4, name: 'almendra' },
];
const alpha = alphabeticalOrder(names);
const sortedNames = names.slice().sort((a, b) => alpha.get(a.id)! - alpha.get(b.id)!).map((n) => n.name);
ok(eq(sortedNames, ['almendra', 'Almojábana', 'Brownie', 'pan']), 'orden alfabético sin distinguir mayúsculas ni tildes');
const withOrder = [
  { id: 1, name: 'B', sort_order: 2 },
  { id: 2, name: 'A', sort_order: 2 },
  { id: 3, name: 'C', sort_order: 1 },
];
ok(eq(withOrder.slice().sort(byCustomOrder).map((p) => p.id), [3, 2, 1]), 'primero por orden y, si empatan, por nombre');

console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
process.exit(failures === 0 ? 0 : 1);
