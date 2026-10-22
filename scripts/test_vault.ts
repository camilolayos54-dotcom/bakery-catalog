import {
  mergeFrontmatter,
  modelFromVault,
  parseFrontmatter,
  parseProductText,
  planExport,
  safeName,
  signatureOfApp,
  signatureOfModel,
  splitFrontmatter,
  type ExportInput,
} from '../src/lib/vault/format';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALLÓ: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function main() {
console.log('--- TESTING CARPETA BAKERY (estilo Obsidian) ---');

// 1. Nombres seguros
assert(safeName('Pan 50/50: "grande"') === 'Pan 50-50- -grande-', 'safeName limpia caracteres prohibidos');
assert(safeName('   ') === 'Sin nombre', 'safeName de vacío -> "Sin nombre"');
assert(safeName('Torta.') === 'Torta', 'safeName quita puntos finales (Windows)');

// 2. Front matter tolerante (acentos, mayúsculas, comillas, CRLF, BOM)
const fm = parseFrontmatter('﻿---\r\nPrecio: "2.500"\r\nPromo_Cantidad: 3\r\n---\r\nnotas');
assert(fm.precio === '2.500' && fm.promo_cantidad === '3', 'front matter con BOM, CRLF y comillas');
assert(Object.keys(parseFrontmatter('sin encabezado')).length === 0, 'sin front matter -> vacío');

// 3. Ida y vuelta: app -> carpeta -> modelo
const data: ExportInput = {
  groups: [
    { id: 1, name: 'Panes' },
    { id: 2, name: 'Pasteles' },
    { id: 3, name: 'Bebidas' }, // vacío a propósito
  ],
  subcategories: [
    { id: 10, group_id: 1, name: 'Tradicionales' },
    { id: 11, group_id: 2, name: 'Sin productos' }, // subcategoría vacía
  ],
  products: [
    { id: 1, name: 'Pan de bono', price_cents: 250000, image_uri: 'file:///x/a.jpg', group_id: 1, subcategory_id: null, promo_qty: 3, promo_price_cents: 600000, sort_order: 30 },
    { id: 2, name: 'Croissant', price_cents: 400000, image_uri: null, group_id: 1, subcategory_id: 10, promo_qty: null, promo_price_cents: null, sort_order: 10 },
    { id: 3, name: 'Almojábana', price_cents: 200050, image_uri: 'data:image/png;base64,AAAA', group_id: 2, subcategory_id: null, promo_qty: null, promo_price_cents: null, sort_order: 40 },
    { id: 4, name: 'Suelto', price_cents: 100000, image_uri: null, group_id: null, subcategory_id: null, promo_qty: null, promo_price_cents: null, sort_order: 20 },
  ],
};
const plan = planExport(data);
const vault = new Map<string, string>(); // path -> text ('' para imágenes)
for (const f of plan.files) vault.set(f.path.join('/'), f.text);
for (const i of plan.images) vault.set(i.path.join('/'), '');

assert(vault.has('Panes/Pan de bono.md') && vault.has('Panes/Pan de bono.jpg'), 'crea md + portada con el mismo nombre');
assert(vault.has('Pasteles/Almojábana.png'), 'la extensión sale del tipo de imagen (data:image/png)');
assert(vault.has('Panes/Tradicionales/Croissant.md'), 'subcategoría = subcarpeta');
assert(vault.has('Suelto.md'), 'producto sin grupo va en la raíz');
assert(vault.has('Bebidas/_grupo.md') && vault.has('Pasteles/Sin productos/_grupo.md'), 'grupos/subcategorías vacíos dejan marcador');
assert(vault.get('Pasteles/Almojábana.md')!.includes('precio: 2000.5'), 'precio con decimales se guarda en pesos');
assert((vault.get('Panes/Pan de bono.md') ?? '').includes('promo_cantidad: 3'), 'la promo queda en el encabezado');

const files = [...vault.keys()].map((k) => k.split('/'));
const read = async (p: string[]) => vault.get(p.join('/')) ?? '';
const model = await modelFromVault(files, read);

assert(model.groups.join(',') === 'Panes,Pasteles,Bebidas', 'respeta el orden de grupos (_orden.md)');
assert(model.products.length === 4, 'recupera los 4 productos (ignora _orden.md y _grupo.md)');
assert(signatureOfModel(model) === signatureOfApp(data), 'firma carpeta == firma app (no hay cambios falsos)');

const bono = model.products.find((p) => p.name === 'Pan de bono')!;
assert(bono.promo_qty === 3 && bono.promo_price_cents === 600000, 'promoción recuperada');
assert(bono.imagePath?.join('/') === 'Panes/Pan de bono.jpg', 'portada asociada al producto');

// 3b. Orden personalizado
assert((vault.get('Panes/Pan de bono.md') ?? '').includes('orden: 30'), 'el orden queda guardado en el encabezado (orden: 30)');
assert(model.products.find((p) => p.name === 'Croissant')!.sort_order === 10, 'el orden se lee de vuelta del archivo');
const byOrder = [...model.products].sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity)).map((p) => p.name);
assert(byOrder.join(',') === 'Croissant,Suelto,Pan de bono,Almojábana', 'los productos se ordenan por "orden", no por nombre');
// los números con huecos (10,20,30,40 vs 1,2,3,4) no son una diferencia
const renumbered: ExportInput = { ...data, products: data.products.map((p, i) => ({ ...p, sort_order: [3, 1, 4, 2][i] })) };
assert(signatureOfApp(renumbered) === signatureOfModel(model), 'mismos productos en el mismo orden con otros números = sin diferencias');
// mover un producto SÍ es una diferencia
const moved: ExportInput = { ...data, products: data.products.map((p) => (p.id === 4 ? { ...p, sort_order: 5 } : p)) };
assert(signatureOfApp(moved) !== signatureOfModel(model), 'mover un producto en la app se detecta como diferencia');
// una nota sin "orden" (creada a mano) queda al final, por nombre
const withNew = new Map(vault);
withNew.set('Panes/Brownie.md', '---\nprecio: 3500\n---\n');
const modelNew = await modelFromVault([...withNew.keys()].map((k) => k.split('/')), async (p) => withNew.get(p.join('/')) ?? '');
const lastTwo = [...modelNew.products].sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) || a.name.localeCompare(b.name, 'es')).map((p) => p.name).slice(-1);
assert(lastTwo[0] === 'Brownie', 'una nota nueva sin "orden" queda al final');
assert(parseProductText('---\norden: abc\n---').order === null && parseProductText('---\norden: 7\n---').order === 7, '"orden" inválido se ignora');

// 4. Editar "como en Obsidian": cambiar precio a mano en el PC
vault.set('Panes/Tradicionales/Croissant.md', '---\nprecio: 4.500\n---\nMi nota personal');
const edited = await modelFromVault([...vault.keys()].map((k) => k.split('/')), read);
assert(edited.products.find((p) => p.name === 'Croissant')!.price_cents === 450000, 'editar el .md cambia el precio');
assert(signatureOfModel(edited) !== signatureOfApp(data), 'la edición externa se detecta como diferencia');

// 4b. Las notas del usuario sobreviven cuando la app reescribe el encabezado
const withNote = '---\nprecio: 4.500\n---\nMi nota: la hace Doña Rosa.\n';
const merged = mergeFrontmatter(withNote, '---\nprecio: 5000\n---\n');
assert(merged === '---\nprecio: 5000\n---\nMi nota: la hace Doña Rosa.\n', 'mergeFrontmatter conserva la nota del usuario');
assert(mergeFrontmatter('solo nota sin encabezado', '---\nprecio: 1\n---\n') === '---\nprecio: 1\n---\nsolo nota sin encabezado', 'nota sin encabezado: se antepone el encabezado');
assert(splitFrontmatter('---\r\nprecio: 1\r\n---\r\ncuerpo').body === 'cuerpo', 'splitFrontmatter funciona con CRLF');

// 5. Archivos ajenos: Obsidian, notas, imágenes sueltas, extensión mayúscula
const foreign = new Map<string, string>([
  ['.obsidian/app.json', '{}'],
  ['Panes/_plantilla.md', '---\nprecio: 1\n---'],
  ['Panes/Mogolla.md', 'sin front matter'],
  ['Panes/Mogolla.JPG', ''],
  ['Panes/leeme.txt', 'hola'],
  ['Tortas/Torta negra.md', '---\nprecio: $15.000\nimagen: foto.png\n---'],
  ['Tortas/foto.png', ''],
]);
const fm2 = await modelFromVault([...foreign.keys()].map((k) => k.split('/')), async (p) => foreign.get(p.join('/')) ?? '');
assert(fm2.products.length === 2, 'ignora .obsidian, plantillas "_" y archivos que no son .md');
assert(fm2.products.find((p) => p.name === 'Mogolla')!.price_cents === 0, 'nota sin precio -> $0 (editable)');
assert(fm2.products.find((p) => p.name === 'Mogolla')!.imagePath?.join('/') === 'Panes/Mogolla.JPG', 'encuentra portada .JPG');
assert(fm2.products.find((p) => p.name === 'Torta negra')!.imagePath?.join('/') === 'Tortas/foto.png', 'campo imagen: apunta a otro archivo');
assert(fm2.products.find((p) => p.name === 'Torta negra')!.price_cents === 1500000, '"$15.000" se interpreta como pesos');

// 6. Nombres duplicados no se pisan
const dup = planExport({
  groups: [{ id: 1, name: 'A' }],
  subcategories: [],
  products: [
    { id: 1, name: 'Pan', price_cents: 100, image_uri: null, group_id: 1, subcategory_id: null, promo_qty: null, promo_price_cents: null, sort_order: 1 },
    { id: 2, name: 'pan', price_cents: 200, image_uri: null, group_id: 1, subcategory_id: null, promo_qty: null, promo_price_cents: null, sort_order: 2 },
  ],
});
const names = dup.files.map((f) => f.path.join('/'));
assert(new Set(names.map((n) => n.toLowerCase())).size === names.length, 'dos productos con el mismo nombre no se sobrescriben');

console.log('--- TODO OK ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
