import fs from 'node:fs';

const b = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const gname = new Map<number, string>(b.groups.map((g: any) => [g.id, g.name]));
console.log('CATEGORÍAS Y SUBCATEGORÍAS');
for (const g of b.groups) {
  console.log(`- [${g.id}] ${g.name}: ` + b.subcategories.filter((s: any) => s.group_id === g.id).map((s: any) => `${s.name}(${s.id})`).join(', '));
}
const counts = new Map<string, number>();
for (const p of b.products) counts.set(gname.get(p.group_id) ?? 'SIN', (counts.get(gname.get(p.group_id) ?? 'SIN') ?? 0) + 1);
console.log('\nPRODUCTOS POR CATEGORÍA', Object.fromEntries(counts));
const created = b.products.map((p: any) => p.created_at);
console.log('\ncreated_at distintos:', new Set(created).size, '| min', new Date(Math.min(...created)).toISOString(), '| max', new Date(Math.max(...created)).toISOString());
const pan = b.products.filter((p: any) => gname.get(p.group_id) === 'Panadería Horneada');
console.log(`\nEn "Panadería Horneada" (${pan.length}):`);
console.log(pan.map((p: any) => p.name).join(' | '));
