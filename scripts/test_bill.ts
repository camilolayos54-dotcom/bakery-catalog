// Cuenta (pestaña Sumas): precios, promociones, descuentos, división y vuelto.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/test_bill.ts
import { computeBill } from '../src/lib/bill';
import { lineSavings, lineTotal } from '../src/lib/cart';
import { formatPrice, isSellablePrice, MAX_PRICE_CENTS, parsePrice } from '../src/lib/money';
import type { Product } from '../src/types';

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✅ ${msg}`);
  else {
    failures++;
    console.error(`❌ FALLÓ: ${msg}`);
  }
}

const prod = (id: number, price: number, promo?: [number, number]): Product => ({
  id,
  name: `P${id}`,
  price_cents: price * 100,
  image_uri: null,
  group_id: null,
  subcategory_id: null,
  created_at: 0, sort_order: 0,
  promo_qty: promo ? promo[0] : null,
  promo_price_cents: promo ? promo[1] * 100 : null,
});

const base = { discountText: '', discountIsPercent: true, extraText: '', peopleText: '', receivedText: '' };

console.log('--- TEST DE LA CUENTA ---');

// 1. Precios escritos por el usuario
ok(parsePrice('2500') === 250000 && parsePrice('2.500') === 250000 && parsePrice('$ 2.500') === 250000, 'precios con punto, $ y espacios');
ok(parsePrice('1.234,56') === 123456 && parsePrice('1234.56') === 123456, 'decimales con coma o con punto');
ok(parsePrice('1e6') === null && parsePrice('abc') === null && parsePrice('') === null && parsePrice('-5') === null, 'rechaza notación científica, texto, vacío y negativos');
ok(parsePrice('99999999999999') === null, 'rechaza un precio imposible (más de $100.000.000)');
ok(parsePrice('100000000') === MAX_PRICE_CENTS, 'acepta justo el máximo ($100.000.000)');
ok(!isSellablePrice(0) && !isSellablePrice(null) && isSellablePrice(100), 'un precio vendible debe ser mayor a cero');

// 2. Promociones
const pan = prod(1, 2500, [3, 6000]);
ok(lineTotal(pan, 1) === 250000 && lineTotal(pan, 3) === 600000, '1 unidad a precio normal, 3 con promo');
ok(lineTotal(pan, 7) === 1450000 && lineSavings(pan, 7) === 300000, '7 unidades = 2 combos + 1 suelta = $14.500 (ahorra $3.000)');
ok(lineTotal(pan, 0) === 0, 'cantidad 0 = $0');
const mala = prod(2, 1000, [3, 9000]); // "promoción" más cara que el precio normal
ok(lineTotal(mala, 3) === 300000 && lineSavings(mala, 3) === 0, 'una promoción más cara que el precio normal nunca cobra de más');

// 3. Cuenta completa (mismos números que probamos en pantalla)
const almo = prod(10, 1300, [4, 5000]);
const agua = prod(11, 1500);
let b = computeBill({ ...base, lines: [{ product: almo, qty: 5 }, { product: agua, qty: 2 }] });
ok(b.units === 7 && b.subtotal === 930000 && b.promoSaved === 20000 && b.total === 930000, 'Almojábana x5 + Agua x2 = $9.300, ahorra $200');

b = computeBill({ ...base, discountText: '10', extraText: '2000', peopleText: '3', receivedText: '20000', lines: [{ product: almo, qty: 5 }, { product: agua, qty: 2 }] });
ok(b.discountCents === 93000 && b.extraCents === 200000 && b.total === 1037000, '10% de descuento + $2.000 extra = $10.370');
ok(b.perPerson === 345700, 'dividir entre 3 = $3.457 (redondeado hacia arriba, sin centavos)');
ok(b.change === 963000, 'vuelto de $20.000 = $9.630');

// 4. Descuentos raros
const one = { ...base, lines: [{ product: almo, qty: 5 }, { product: agua, qty: 2 }] };
ok(computeBill({ ...one, discountText: '-5' }).discountCents === 0, 'descuento negativo se ignora');
ok(computeBill({ ...one, discountText: 'abc' }).discountCents === 0, 'descuento con texto se ignora');
ok(computeBill({ ...one, discountText: '150' }).total === 0, 'descuento de 150% se limita al 100%');
ok(computeBill({ ...one, discountText: '10,5' }).discountCents % 100 === 0, 'descuento de 10,5% queda en pesos enteros (sin centavos)');
ok(formatPrice(computeBill({ ...one, discountText: '10,5' }).total).indexOf(',') === -1, 'el total con 10,5% no muestra decimales');
ok(computeBill({ ...one, discountIsPercent: false, discountText: '500' }).total === 880000, 'descuento de $500 = $8.800');
ok(computeBill({ ...one, discountIsPercent: false, discountText: '99999' }).total === 0, 'descuento en pesos mayor al total deja $0 (no negativo)');
ok(computeBill({ ...one, discountIsPercent: false, discountText: '-1' }).discountCents === 0, 'descuento en pesos negativo se ignora');

// 5. Dividir y vuelto
ok(computeBill({ ...one, peopleText: '1' }).perPerson === null && computeBill({ ...one, peopleText: '0' }).perPerson === null, 'dividir entre 0 o 1 no muestra nada');
ok(computeBill({ ...one, peopleText: 'x' }).perPerson === null, 'dividir entre texto no muestra nada');
ok(computeBill({ ...one, peopleText: '2' }).perPerson === 465000, '9.300 entre 2 = $4.650');
ok(computeBill({ ...one, receivedText: '5000' }).change === -430000, 'si pagan menos, muestra lo que falta (−$4.300)');
ok(computeBill({ ...one, receivedText: '' }).change === null, 'sin "recibido" no hay vuelto');

// 6. Cuenta vacía y extras
b = computeBill({ ...base, lines: [] });
ok(b.total === 0 && b.units === 0 && b.perPerson === null, 'cuenta vacía = $0');
ok(computeBill({ ...base, extraText: 'abc', lines: [{ product: agua, qty: 1 }] }).total === 150000, 'extra con texto se ignora');

console.log(failures === 0 ? '--- TODO OK ---' : `--- ${failures} FALLO(S) ---`);
process.exit(failures === 0 ? 0 : 1);
