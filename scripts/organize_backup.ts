// Ordena un respaldo .json: cada producto va a su categoría y subcategoría correctas.
// No modifica el archivo original: escribe uno nuevo.
//   npx tsx --tsconfig scripts/tsconfig.test.json scripts/organize_backup.ts <respaldo.json> <salida.json>
import fs from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Uso: organize_backup.ts <respaldo.json> <salida.json>');
  process.exit(1);
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Nombre del producto (sin tildes ni mayúsculas) -> [categoría, subcategoría | null]
const PLACE: Record<string, [string, string | null]> = {
  // Lácteos
  'avena tarrito': ['Lácteos', 'Yogurt y Avena'],
  'actiges': ['Lácteos', 'Yogurt y Avena'],
  'alqueria yogur': ['Lácteos', 'Yogurt y Avena'],
  'yogo yogo tarrito': ['Lácteos', 'Yogurt y Avena'],
  'gelatina boggy 3000': ['Lácteos', 'Gelatina'],
  'leche ricura': ['Lácteos', 'Leches y Chocolatadas'],
  'leche deslactosada': ['Lácteos', 'Leches y Chocolatadas'],
  'leche colanta 200 ml': ['Lácteos', 'Leches y Chocolatadas'],
  'alqueria': ['Lácteos', 'Leches y Chocolatadas'],
  // Snacks, dulces y cigarrillos
  'trolli': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'bom bom bun': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'bianchi': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'triden 8,5 g': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'trident 30,6 g': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'trident 5,1 g': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'chao': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'mamit': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'frunas': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'pin pop': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'lenguas 2800': ['Snacks, Dulces y Cigarrillos', 'Chicles y Caramelos'],
  'tosh': ['Snacks, Dulces y Cigarrillos', 'Dulce'],
  'cocosette': ['Snacks, Dulces y Cigarrillos', 'Dulce'],
  'milo 48,7': ['Snacks, Dulces y Cigarrillos', 'Dulce'],
  'festival': ['Snacks, Dulces y Cigarrillos', 'Dulce'],
  'oreo': ['Snacks, Dulces y Cigarrillos', 'Dulce'],
  'oreo pequena 2500': ['Snacks, Dulces y Cigarrillos', 'Dulce'],
  'club social': ['Snacks, Dulces y Cigarrillos', 'Snacks Salados'],
  'cracks 2000': ['Snacks, Dulces y Cigarrillos', 'Snacks Salados'],
  // Papitas
  'quipitos': ['Papitas', null],
  // Aguas e hidratantes
  'acquan 600 ml': ['Aguas e Hidratantes', 'Aguas'],
  'brisa litro y medio': ['Aguas e Hidratantes', 'Aguas'],
  'agua brisa saborizada': ['Aguas e Hidratantes', 'Aguas'],
  'monster': ['Aguas e Hidratantes', 'Energizantes e Hidratantes'],
  'powerade': ['Aguas e Hidratantes', 'Energizantes e Hidratantes'],
  'fury energy': ['Aguas e Hidratantes', 'Energizantes e Hidratantes'],
  // Gaseosas y maltas
  'premio 1.5': ['Gaseosas y Maltas', 'Otras Bebidas'],
  'cuatro litro y medio': ['Gaseosas y Maltas', 'Otras Bebidas'],
  'cocacola litro y medio 8500': ['Gaseosas y Maltas', 'Otras Bebidas'],
  'cocacola 400 ml': ['Gaseosas y Maltas', 'Otras Bebidas'],
  'cocacola vidrio 237': ['Gaseosas y Maltas', 'Otras Bebidas'],
  'del valle 400 ml': ['Gaseosas y Maltas', 'Del Valle'],
  'del valle de 500 ml': ['Gaseosas y Maltas', 'Del Valle'],
  // Licores (no tenían categoría: estaban dentro de Cervezas)
  'aguardiente amarillo': ['Licores', null],
  'bosque de indias': ['Licores', null],
};

const b = JSON.parse(fs.readFileSync(input, 'utf8'));

// Categoría nueva "Licores" si hace falta
const gid = new Map<string, number>(b.groups.map((g: any) => [g.name, g.id]));
if (!gid.has('Licores')) {
  const id = Math.max(...b.groups.map((g: any) => g.id)) + 1;
  b.groups.push({ id, name: 'Licores', sort_order: Math.max(...b.groups.map((g: any) => g.sort_order)) + 1 });
  gid.set('Licores', id);
}
const sid = new Map<string, number>(b.subcategories.map((s: any) => [`${s.group_id}|${s.name}`, s.id]));

const moved: string[] = [];
const unknown: string[] = [];
const names = new Map<string, number>();
for (const p of b.products) {
  const key = fold(p.name);
  names.set(key, (names.get(key) ?? 0) + 1);
  const target = PLACE[key];
  if (!target) continue;
  const g = gid.get(target[0]);
  if (g === undefined) throw new Error(`Categoría inexistente: ${target[0]}`);
  const s = target[1] ? sid.get(`${g}|${target[1]}`) : null;
  if (target[1] && s === undefined) throw new Error(`Subcategoría inexistente: ${target[0]} › ${target[1]}`);
  if (p.group_id !== g || (p.subcategory_id ?? null) !== (s ?? null)) {
    const from = b.groups.find((x: any) => x.id === p.group_id)?.name ?? 'Sin categoría';
    moved.push(`${p.name}: ${from} → ${target[0]}${target[1] ? ' › ' + target[1] : ''}`);
    p.group_id = g;
    p.subcategory_id = s ?? null;
  }
}

// Lo que sigue en "Panadería Horneada" y no parece de panadería, para que lo revises
const panId = gid.get('Panadería Horneada');
const originalNames = new Set([
  'almojabana', 'chicharron horneado', 'croissant de chocolate', 'croissant de jamon y queso (grande)',
  'croissant de jamon y queso (personal)', 'croissant de queso', 'mogolla de mozzarella', 'palito de queso horneado',
  'palitroques', 'pan agridulce', 'pan chino', 'pan chocha', 'pan crema', 'pan de maiz y queso', 'pan galleta',
  'pan hawaiano', 'pan mariquiteno (grande)', 'pan mariquiteno (pequeno)', 'pan ranchero', 'pan tradicional',
  'pastel de arequipe', 'pastel de guayaba y queso', 'pastel de queso y arequipe',
]);
for (const p of b.products) if (p.group_id === panId && !originalNames.has(fold(p.name))) unknown.push(p.name);

const dups = [...names.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k} (x${n})`);

b.exported_at = Date.now();
b.exported_at_readable = new Date().toLocaleString('es-CO') + ' (organizado)';
fs.writeFileSync(output, JSON.stringify(b));

const gname = new Map<number, string>(b.groups.map((g: any) => [g.id, g.name]));
const counts: Record<string, number> = {};
for (const p of b.products) counts[gname.get(p.group_id) ?? 'SIN CATEGORÍA'] = (counts[gname.get(p.group_id) ?? 'SIN CATEGORÍA'] ?? 0) + 1;

console.log(`Productos reubicados: ${moved.length}`);
for (const m of moved) console.log('  • ' + m);
console.log('\nProductos por categoría:', counts);
console.log(`\nSiguen en "Panadería Horneada" y no son claramente de panadería (revísalos): ${unknown.join(' | ') || '—'}`);
console.log(`Nombres repetidos: ${dups.join(', ') || '—'}`);
console.log(`Total productos: ${b.products.length} (antes ${JSON.parse(fs.readFileSync(input, 'utf8')).products.length})`);
console.log(`Archivo nuevo: ${output}`);
