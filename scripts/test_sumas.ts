import { hasPromo, lineSavings, lineTotal, promoLabel } from '../src/lib/cart';
import { formatPrice, parsePrice } from '../src/lib/money';
import type { Product } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALLÓ: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('--- INICIANDO TESTING DE SUMAS Y CÁLCULOS FINANCIEROS ---');

// 1. Parsing y formato de precios
assert(parsePrice('2500') === 250000, 'parsePrice("2500") -> 250.000 centavos ($2.500)');
assert(parsePrice('10.000') === 1000000, 'parsePrice("10.000") -> 1.000.000 centavos ($10.000)');
assert(parsePrice('$ 37.000') === 3700000, 'parsePrice("$ 37.000") -> 3.700.000 centavos ($37.000)');
assert(parsePrice('4000') === 400000, 'parsePrice("4000") -> 400.000 centavos ($4.000)');
assert(formatPrice(400000) === '$4.000', 'formatPrice(400000) -> "$4.000"');
assert(formatPrice(6000000) === '$60.000', 'formatPrice(6000000) -> "$60.000"');

// 2. Líneas sin promoción
const panCrema: Product = {
  id: 1,
  name: 'Pan crema',
  price_cents: 400000, // $4.000
  image_uri: null,
  group_id: 1,
  subcategory_id: null,
  created_at: 0,
  promo_qty: null,
  promo_price_cents: null,
};

assert(lineTotal(panCrema, 1) === 400000, '1 Pan crema = $4.000');
assert(lineTotal(panCrema, 3) === 1200000, '3 Pan crema = $12.000');
assert(lineTotal(panCrema, 5) === 2000000, '5 Pan crema = $20.000');
assert(lineSavings(panCrema, 5) === 0, 'Ahorro en producto sin promo = $0');

// 3. Líneas con promoción (Combo) según las especificaciones del negocio
// A) Palitroques: $600 c/u, combo 4 por $2.000 (ahorra $400)
const palitroquesReal: Product = {
  id: 2,
  name: 'Palitroques',
  price_cents: 60000, // $600
  image_uri: null,
  group_id: 1,
  subcategory_id: null,
  created_at: 0,
  promo_qty: 4,
  promo_price_cents: 200000, // 4 por $2.000
};

assert(hasPromo(palitroquesReal) === true, 'Palitroques detectado con promoción');
assert(lineTotal(palitroquesReal, 1) === 60000, '1 Palitroque = $600');
assert(lineTotal(palitroquesReal, 3) === 180000, '3 Palitroques = $1.800');
assert(lineTotal(palitroquesReal, 4) === 200000, '4 Palitroques aplica combo 4x$2.000 = $2.000');
assert(lineSavings(palitroquesReal, 4) === 40000, 'Ahorro de 4 Palitroques = $400 (normal $2.400 vs $2.000)');
assert(lineTotal(palitroquesReal, 5) === 260000, '5 Palitroques (4 en combo $2.000 + 1 suelto $600) = $2.600');

// B) Pan agridulce: $900 c/u, combo 3 por $2.500 (ahorra $200)
const panAgridulce: Product = {
  id: 3,
  name: 'Pan agridulce',
  price_cents: 90000, // $900
  image_uri: null,
  group_id: 1,
  subcategory_id: null,
  created_at: 0,
  promo_qty: 3,
  promo_price_cents: 250000, // 3 por $2.500
};
assert(lineTotal(panAgridulce, 1) === 90000, '1 Pan agridulce = $900');
assert(lineTotal(panAgridulce, 2) === 180000, '2 Pan agridulce = $1.800');
assert(lineTotal(panAgridulce, 3) === 250000, '3 Pan agridulce aplica combo 3x$2.500 = $2.500');
assert(lineSavings(panAgridulce, 3) === 20000, 'Ahorro de 3 Panes agridulces = $200 (normal $2.700 vs $2.500)');

// C) Pan chino: $1.000 c/u (sin promo)
const panChino: Product = {
  id: 4,
  name: 'Pan chino',
  price_cents: 100000, // $1.000
  image_uri: null,
  group_id: 1,
  subcategory_id: null,
  created_at: 0,
  promo_qty: null,
  promo_price_cents: null,
};
assert(lineTotal(panChino, 3) === 300000, '3 Pan chino = $3.000');

// D) Almojábana: $1.300 c/u, combo 4 por $5.000 (ahorra $200)
const almojabana: Product = {
  id: 5,
  name: 'Almojábana',
  price_cents: 130000, // $1.300
  image_uri: null,
  group_id: 1,
  subcategory_id: null,
  created_at: 0,
  promo_qty: 4,
  promo_price_cents: 500000, // 4 por $5.000
};
assert(lineTotal(almojabana, 4) === 500000, '4 Almojábanas combo = $5.000');
assert(lineSavings(almojabana, 4) === 20000, 'Ahorro 4 Almojábanas = $200 ($5.200 vs $5.000)');

// E) Cigarrillos: Marlboro ($1.000), Star Lite ($800), Mentolados ($1.200)
const marlboro: Product = { id: 6, name: 'Cigarrillo Marlboro', price_cents: 100000, image_uri: null, group_id: 8, subcategory_id: null, created_at: 0, promo_qty: null, promo_price_cents: null };
const starLite: Product = { id: 7, name: 'Cigarrillo Star Lite', price_cents: 80000, image_uri: null, group_id: 8, subcategory_id: null, created_at: 0, promo_qty: null, promo_price_cents: null };
const mentolado: Product = { id: 8, name: 'Cigarrillo Mentolado', price_cents: 120000, image_uri: null, group_id: 8, subcategory_id: null, created_at: 0, promo_qty: null, promo_price_cents: null };
assert(lineTotal(marlboro, 2) === 200000, '2 Marlboro = $2.000');
assert(lineTotal(starLite, 3) === 240000, '3 Star Lite = $2.400');
assert(lineTotal(mentolado, 2) === 240000, '2 Mentolados = $2.400');

// Promo con descuento real: Ej: Croissant $4.000 c/u, pero promo: 3 por $10.000 (ahorra $2.000)
const croissantPromo: Product = {
  id: 3,
  name: 'Croissant especial',
  price_cents: 400000, // $4.000
  image_uri: null,
  group_id: 1,
  subcategory_id: null,
  created_at: 0,
  promo_qty: 3,
  promo_price_cents: 1000000, // $10.000
};

assert(lineTotal(croissantPromo, 1) === 400000, '1 croissant = $4.000');
assert(lineTotal(croissantPromo, 2) === 800000, '2 croissants = $8.000');
assert(lineTotal(croissantPromo, 3) === 1000000, '3 croissants con promo = $10.000');
assert(lineSavings(croissantPromo, 3) === 200000, 'Ahorro de 3 croissants = $2.000');
assert(lineTotal(croissantPromo, 7) === 2400000, '7 croissants (2 combos x $10.000 + 1 suelto x $4.000) = $24.000');
assert(lineSavings(croissantPromo, 7) === 400000, 'Ahorro de 7 croissants = $4.000 (precio normal $28.000)');

// 4. Carrito combinado y subtotales
const cart = {
  [panCrema.id]: 2, // 2 x 4.000 = 8.000
  [croissantPromo.id]: 4, // 3 por 10.000 + 1 por 4.000 = 14.000
};

const items = [panCrema, croissantPromo];
const line1 = lineTotal(panCrema, cart[panCrema.id]);
const line2 = lineTotal(croissantPromo, cart[croissantPromo.id]);
const subtotal = line1 + line2;
assert(subtotal === 2200000, 'Subtotal combinado (8.000 + 14.000) = $22.000');

// 5. Descuentos en porcentaje y valor fijo
const disc10Pct = Math.round(subtotal * 0.1);
assert(disc10Pct === 220000, 'Descuento 10% de $22.000 = $2.200');
const totalConPct = subtotal - disc10Pct;
assert(totalConPct === 1980000, 'Total con 10% de descuento = $19.800');

const discFijo = 500000; // $5.000
const totalConFijo = subtotal - discFijo;
assert(totalConFijo === 1700000, 'Total con descuento fijo de $5.000 = $17.000');

// 6. Recargo adicional (ej. Domicilio)
const domicilio = 300000; // $3.000
const totalFinal = totalConPct + domicilio;
assert(totalFinal === 2280000, 'Total final ($19.800 + $3.000 domicilio) = $22.800');

// 7. División entre personas
const personas = 3;
const porPersona = Math.round(totalFinal / personas);
assert(porPersona === 760000, 'Cada una de las 3 personas paga exactamente $7.600');

// 8. Cálculo de vuelto (cambio)
const recibido = 5000000; // $50.000
const cambio = recibido - totalFinal;
assert(cambio === 2720000, 'Vuelto de $50.000 pagando $22.800 = $27.200');

const recibidoInsuficiente = 2000000; // $20.000
const falta = recibidoInsuficiente - totalFinal;
assert(falta === -280000, 'Detecta faltante de $2.800 si paga $20.000');

console.log('--- TODOS LOS TESTS DE MATEMÁTICAS Y SUMAS PASARON CON 100% DE ÉXITO ---');
