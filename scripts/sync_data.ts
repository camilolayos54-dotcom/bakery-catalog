import * as fs from 'fs';
import * as path from 'path';
import { INITIAL_CATALOG } from '../src/db/initialData';
import type { BackupPayload, ExportedProduct, Group, Subcategory } from '../src/types';

const DATA_SYNC_DIR = path.resolve(__dirname, '../data_sync');
const LATEST_JSON_PATH = path.join(DATA_SYNC_DIR, 'catalog_latest.json');

if (!fs.existsSync(DATA_SYNC_DIR)) {
  fs.mkdirSync(DATA_SYNC_DIR, { recursive: true });
}

const action = process.argv[2] || 'export';

if (action === 'export') {
  // Genera un BackupPayload a partir de initialData.ts
  let gId = 1;
  let sId = 1;
  let pId = 1;
  const groups: Group[] = [];
  const subcategories: Subcategory[] = [];
  const products: ExportedProduct[] = [];

  for (const cat of INITIAL_CATALOG) {
    const groupId = gId++;
    groups.push({ id: groupId, name: cat.name, sort_order: cat.sort_order });

    const subMap = new Map<string, number>();
    for (let i = 0; i < cat.subcategories.length; i++) {
      const subId = sId++;
      const sName = cat.subcategories[i];
      subcategories.push({ id: subId, group_id: groupId, name: sName, sort_order: i + 1 });
      subMap.set(sName, subId);
    }

    for (const p of cat.products) {
      const subId = p.subcategory ? subMap.get(p.subcategory) ?? null : null;
      products.push({
        id: pId++,
        name: p.name,
        price_cents: p.price_cents,
        image_uri: null,
        group_id: groupId,
        subcategory_id: subId,
        created_at: Date.now(), sort_order: 0,
        promo_qty: p.promo_qty ?? null,
        promo_price_cents: p.promo_price_cents ?? null,
      });
    }
  }

  const payload: BackupPayload = {
    version: 1,
    exported_at: Date.now(),
    exported_at_readable: new Date().toLocaleString('es-CO'),
    groups,
    subcategories,
    products,
    frequencies: {},
  };

  fs.writeFileSync(LATEST_JSON_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✅ Catálogo exportado con éxito a: ${LATEST_JSON_PATH}`);
  console.log(`📊 Total: ${products.length} productos, ${groups.length} categorías, ${subcategories.length} subcategorías.`);
} else if (action === 'info') {
  if (fs.existsSync(LATEST_JSON_PATH)) {
    const raw = fs.readFileSync(LATEST_JSON_PATH, 'utf-8');
    const data = JSON.parse(raw) as BackupPayload;
    console.log(`📁 Archivo actual: ${LATEST_JSON_PATH}`);
    console.log(`📅 Última exportación: ${data.exported_at_readable || new Date(data.exported_at).toLocaleString()}`);
    console.log(`📦 Productos: ${data.products.length}`);
    console.log(`📂 Categorías: ${data.groups.length}`);
  } else {
    console.log(`⚠️ No existe aún ${LATEST_JSON_PATH}. Ejecuta "npm run sync:export" para crearlo.`);
  }
}
