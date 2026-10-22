// Keeps the app and the Bakery folder in sync (Obsidian-style vault).
//
//  - Folder -> app ("pull"): on opening the app, when it comes back to the foreground, and on demand.
//    The folder wins: products, prices, promotions and covers are loaded from its files.
//  - App -> folder ("push"): shortly after any change made in the app. Only files that really changed
//    are written, and whatever you typed below the front matter of a note is kept.
//  - Last writer wins: if the same product is edited on both sides before syncing, the app's version is kept.

import { AppState, Platform, type AppStateStatus } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { create } from 'zustand';

import * as repo from '@/db/repo';
import { useStore } from '@/store';
import type { BackupPayload, Group, Product, Subcategory } from '@/types';
import {
  extOf,
  mergeFrontmatter,
  modelFromVault,
  parseProductText,
  planExport,
  safeName,
  signatureOfApp,
  signatureOfModel,
  splitFrontmatter,
  type VaultProduct,
} from './format';
import * as vfs from './fs';
import { readLocalImage, saveImportedImage } from './images';
import { EMPTY_STATE, type PickMode, type VaultFS, type VaultState } from './types';

const key = (p: string[]) => p.join('/');

type VaultUi = {
  supported: boolean;
  linked: boolean;
  name: string | null;
  needsPermission: boolean;
  busy: boolean;
  message: string | null;
  error: boolean;
  lastSync: number | null;
};

export const useVault = create<VaultUi>(() => ({
  supported: vfs.isVaultSupported(),
  linked: false,
  name: null,
  needsPermission: false,
  busy: false,
  message: null,
  error: false,
  lastSync: null,
}));

const ui = (patch: Partial<VaultUi>) => useVault.setState(patch);

// ------------------------------------------------------------------ state

let fs: VaultFS | null = null;
let state: VaultState = freshState();
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let appStateSub: { remove: () => void } | null = null;
let queue: Promise<unknown> = Promise.resolve();

function freshState(): VaultState {
  return { ...EMPTY_STATE, managed: {}, images: {}, imageSizes: {} };
}

/** Runs one sync operation at a time. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function guarded<T>(fn: () => Promise<T>, okMessage?: (r: T) => string): Promise<T | null> {
  ui({ busy: true });
  try {
    const r = await fn();
    ui({ busy: false, error: false, message: okMessage ? okMessage(r) : useVault.getState().message });
    return r;
  } catch (e: any) {
    console.warn('[vault]', e);
    ui({ busy: false, error: true, message: `Error con la carpeta: ${e?.message ?? e}` });
    return null;
  }
}

async function persist() {
  state.lastSync = Date.now();
  await vfs.saveVaultState(state);
  ui({ lastSync: state.lastSync });
}

// -------------------------------------------------------------- app data

type AppData = BackupPayload;

const appData = () => repo.exportAllData();

/** Detects any change in the app, including photos, that the folder has not seen yet. */
function fullSig(d: AppData) {
  return JSON.stringify([
    d.groups.map((g) => [g.id, g.name, g.sort_order]),
    d.subcategories.map((s) => [s.id, s.group_id, s.name, s.sort_order]),
    d.products.map((p) => [p.id, p.name, p.price_cents, p.image_uri, p.group_id, p.subcategory_id, p.promo_qty, p.promo_price_cents, p.sort_order]),
  ]);
}

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function safetyBackup(d: AppData) {
  try {
    const json = JSON.stringify({ ...d, products: d.products.map((p) => ({ ...p })) });
    if (Platform.OS === 'web') {
      localStorage.setItem('bakery-backup-before-vault', json);
    } else {
      const f = new File(Paths.document, 'backup_before_vault.json');
      if (!f.exists) f.create();
      f.write(json);
    }
  } catch (e) {
    console.warn('[vault] no se pudo guardar la copia de seguridad', e);
  }
}

// ------------------------------------------------------------------- pull

type PullResult = 'imported' | 'same' | 'empty';

async function pull(): Promise<{ result: PullResult; products: number }> {
  if (!fs) throw new Error('No hay carpeta vinculada');
  const vault = fs;
  const files = await vault.listAll();
  const texts = new Map<string, string>();
  const model = await modelFromVault(files, async (p) => {
    const t = await vault.readText(p);
    texts.set(key(p), t);
    return t;
  });

  // Never wipe the app because the folder looks empty (sync tools may still be downloading).
  if (model.products.length === 0) return { result: 'empty', products: 0 };

  const data = await appData();
  const rememberTexts = () => {
    for (const p of model.products) {
      const t = texts.get(key(p.path));
      if (t != null) state.managed[key(p.path)] = splitFrontmatter(t).fm;
    }
    const order = texts.get('_orden.md');
    if (order != null) state.managed['_orden.md'] = order;
  };

  const appKey = (p: Product, groups: Map<number, Group>, subs: Map<number, Subcategory>) => {
    const g = p.group_id != null ? groups.get(p.group_id) : undefined;
    const s = g && p.subcategory_id != null ? subs.get(p.subcategory_id) : undefined;
    return `${g ? safeName(g.name) : ''}|${s ? safeName(s.name) : ''}|${safeName(p.name)}`;
  };
  const oldGroups = new Map(data.groups.map((g) => [g.id, g]));
  const oldSubs = new Map(data.subcategories.map((s) => [s.id, s]));
  const oldByKey = new Map(data.products.map((p) => [appKey(p, oldGroups, oldSubs), p]));
  const modelKey = (p: VaultProduct) => `${p.group ?? ''}|${p.sub ?? ''}|${p.name}`;

  if (signatureOfModel(model) === signatureOfApp(data)) {
    // Same content: only learn what is in the folder so later pushes don't rewrite files.
    rememberTexts();
    for (const p of model.products) {
      const old = oldByKey.get(modelKey(p));
      if (p.imagePath && old?.image_uri) state.images[key(p.imagePath)] = old.image_uri;
    }
    state.sig = fullSig(data);
    await persist();
    return { result: 'same', products: model.products.length };
  }

  if (data.products.length > 0) safetyBackup(data);

  // Build the new catalog, reusing ids of things that already existed (keeps sales stats and the cart).
  const oldGroupByName = new Map(data.groups.map((g) => [safeName(g.name), g]));
  let nextGroup = Math.max(0, ...data.groups.map((g) => g.id)) + 1;
  const groups: Group[] = model.groups.map((name, i) => {
    const old = oldGroupByName.get(name);
    return { id: old?.id ?? nextGroup++, name: old?.name ?? name, sort_order: i };
  });
  const groupId = new Map(groups.map((g) => [safeName(g.name), g.id]));

  let nextSub = Math.max(0, ...data.subcategories.map((s) => s.id)) + 1;
  const subcategories: Subcategory[] = [];
  const subId = new Map<string, number>();
  for (const g of groups) {
    const oldSubsOfGroup = data.subcategories.filter((s) => s.group_id === g.id);
    (model.subs[safeName(g.name)] ?? []).forEach((name, i) => {
      const old = oldSubsOfGroup.find((s) => safeName(s.name) === name);
      const sub: Subcategory = { id: old?.id ?? nextSub++, group_id: g.id, name: old?.name ?? name, sort_order: i + 1 };
      subcategories.push(sub);
      subId.set(`${safeName(g.name)}|${name}`, sub.id);
    });
  }

  let nextProduct = Math.max(0, ...data.products.map((p) => p.id)) + 1;
  const products: Product[] = [];
  // Position in the catalog: the notes' `orden` first, notes without one go last (alphabetical).
  const position = new Map<VaultProduct, number>(
    [...model.products]
      .sort(
        (a, b) =>
          (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
      )
      .map((p, i) => [p, i + 1]),
  );
  const idMap = new Map<number, number>(); // old product id -> new id (to carry sales stats)
  const usedOld = new Set<number>();

  for (const mp of model.products) {
    const old = oldByKey.get(modelKey(mp));
    const reusable = old && !usedOld.has(old.id) ? old : undefined;
    if (reusable) usedOld.add(reusable.id);

    let image_uri: string | null = null;
    if (mp.imagePath) {
      const pk = key(mp.imagePath);
      const bytes = await vault.readBytes(mp.imagePath);
      if (reusable?.image_uri && state.images[pk] === reusable.image_uri && state.imageSizes[pk] === bytes.length) {
        image_uri = reusable.image_uri; // photo unchanged
      } else {
        const ext = extOf(mp.imagePath[mp.imagePath.length - 1]);
        image_uri = await saveImportedImage(hash(`${pk}:${bytes.length}:${bytes[0] ?? 0}:${bytes[bytes.length - 1] ?? 0}`), ext === 'jpeg' ? 'jpg' : ext, bytes);
      }
      state.images[pk] = image_uri;
      state.imageSizes[pk] = bytes.length;
    }

    const gid = mp.group ? groupId.get(mp.group) ?? null : null;
    const sid = mp.group && mp.sub ? subId.get(`${mp.group}|${mp.sub}`) ?? null : null;
    const id = reusable?.id ?? nextProduct++;
    if (reusable) idMap.set(reusable.id, id);
    products.push({
      id,
      name: reusable?.name ?? mp.name,
      price_cents: mp.price_cents,
      image_uri,
      group_id: gid,
      subcategory_id: sid,
      created_at: reusable?.created_at ?? Date.now(),
      sort_order: position.get(mp) ?? 0,
      promo_qty: mp.promo_qty,
      promo_price_cents: mp.promo_price_cents,
    });
  }

  const frequencies: Record<number, number> = {};
  for (const [oldId, count] of Object.entries(data.frequencies ?? {})) {
    const nid = idMap.get(Number(oldId));
    if (nid != null) frequencies[nid] = count;
  }

  await repo.importAllData({
    version: 1,
    exported_at: Date.now(),
    exported_at_readable: new Date().toLocaleString('es-CO'),
    groups,
    subcategories,
    products,
    frequencies,
  });
  await useStore.getState().reload();

  rememberTexts();
  state.sig = fullSig(await appData());
  await persist();
  return { result: 'imported', products: products.length };
}

// ------------------------------------------------------------------- push

function sameProduct(a: string, b: string) {
  const x = parseProductText(a);
  const y = parseProductText(b);
  return (
    x.price_cents === y.price_cents &&
    x.promo_qty === y.promo_qty &&
    x.promo_price_cents === y.promo_price_cents &&
    x.order === y.order &&
    x.image === y.image
  );
}

async function push(data: AppData): Promise<{ written: number; removed: number }> {
  if (!fs) throw new Error('No hay carpeta vinculada');
  const vault = fs;
  const plan = planExport(data);
  const existing = new Set((await vault.listAll()).map(key));
  let written = 0;
  let removed = 0;

  for (const f of plan.files) {
    const k = key(f.path);
    const known = state.managed[k];
    if (f.kind === 'meta') {
      if (!(existing.has(k) && known === f.text)) {
        await vault.writeText(f.path, f.text);
        written++;
      }
    } else if (!existing.has(k)) {
      await vault.writeText(f.path, f.text);
      written++;
    } else if (known !== f.text) {
      const old = await vault.readText(f.path);
      if (!sameProduct(old, f.text)) {
        await vault.writeText(f.path, mergeFrontmatter(old, f.text));
        written++;
      }
    }
    state.managed[k] = f.text;
  }

  for (const img of plan.images) {
    const k = key(img.path);
    if (existing.has(k) && state.images[k] === img.source) continue;
    const bytes = await readLocalImage(img.source);
    if (!bytes) continue;
    await vault.writeBytes(img.path, bytes);
    state.images[k] = img.source;
    state.imageSizes[k] = bytes.length;
    written++;
  }

  // Remove files we manage that no longer correspond to anything in the app.
  const keep = new Set([...plan.files.map((f) => key(f.path)), ...plan.images.map((i) => key(i.path))]);
  for (const k of [...Object.keys(state.managed), ...Object.keys(state.images)]) {
    if (keep.has(k)) continue;
    if (existing.has(k)) {
      await vault.remove(k.split('/'));
      removed++;
    }
    delete state.managed[k];
    delete state.images[k];
    delete state.imageSizes[k];
  }

  state.sig = fullSig(data);
  await persist();
  return { written, removed };
}

async function pushIfChanged(): Promise<boolean> {
  if (!fs) return false;
  const data = await appData();
  if (fullSig(data) === state.sig) return false;
  await push(data);
  return true;
}

// ----------------------------------------------------------------- watch

function schedulePush() {
  if (!fs) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void enqueue(() =>
      guarded(pushIfChanged, (changed) =>
        changed ? 'Cambios guardados en la carpeta.' : (useVault.getState().message ?? ''),
      ),
    );
  }, 1500);
}

function onAppState(next: AppStateStatus) {
  if (next !== 'active' || !fs) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  void syncNow();
}

function startWatching() {
  stopWatching();
  unsubscribeStore = useStore.subscribe((s, prev) => {
    if (s.products !== prev.products || s.groups !== prev.groups || s.subcategories !== prev.subcategories) {
      schedulePush();
    }
  });
  appStateSub = AppState.addEventListener('change', onAppState);
}

function stopWatching() {
  unsubscribeStore?.();
  unsubscribeStore = null;
  appStateSub?.remove();
  appStateSub = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

// ------------------------------------------------------------ public API

function describePull(r: { result: PullResult; products: number }) {
  if (r.result === 'imported') return `Se cargaron ${r.products} productos desde la carpeta.`;
  if (r.result === 'same') return 'Todo al día: la carpeta y la app coinciden.';
  return 'La carpeta no tiene productos todavía.';
}

/** Pushes pending app changes, then loads whatever changed in the folder. */
export function syncNow(): Promise<void> {
  return enqueue(async () => {
    await guarded(async () => {
      await pushIfChanged();
      return pull();
    }, describePull);
  }).then(() => undefined);
}

/** Picks the folder (must be called from a tap) and does the first sync. */
export async function linkVault(mode: PickMode): Promise<void> {
  const picked = await vfs.pickVault(mode);
  if (!picked) {
    ui({ error: true, message: 'No se eligió ninguna carpeta.' });
    return;
  }
  await enqueue(async () => {
    fs = picked;
    state = freshState();
    ui({ linked: true, name: picked.name, needsPermission: false });
    await guarded(
      async () => {
        const r = await pull();
        if (r.result === 'empty') {
          // Empty folder: fill it with the current catalog.
          await push(await appData());
          return `Carpeta "${picked.name}" creada con el catálogo actual.`;
        }
        return describePull(r);
      },
      (m) => m,
    );
    startWatching();
  });
}

/** Reopens the folder remembered from the last session. Call once the app data is loaded. */
export async function initVault(): Promise<void> {
  const opened = await vfs.openSavedVault();
  if (opened.status === 'none') return;
  if (opened.status === 'needs-permission') {
    ui({ linked: true, name: opened.name, needsPermission: true });
    return;
  }
  fs = opened.fs;
  state = await vfs.loadVaultState();
  ui({ linked: true, name: opened.fs.name, needsPermission: false, lastSync: state.lastSync ?? null });
  startWatching();
  await syncNow();
}

/** After Android/the browser revoked access: pick/allow the folder again (from a tap). */
export async function reconnectVault(): Promise<void> {
  const again = await vfs.reconnectVault();
  if (!again) {
    ui({ error: true, message: 'No se pudo recuperar el acceso a la carpeta.' });
    return;
  }
  fs = again;
  state = await vfs.loadVaultState();
  ui({ linked: true, name: again.name, needsPermission: false });
  startWatching();
  await syncNow();
}

export async function unlinkVault(): Promise<void> {
  await enqueue(async () => {
    stopWatching();
    fs = null;
    state = freshState();
    await vfs.forgetVault();
    ui({ linked: false, name: null, needsPermission: false, message: 'Carpeta desvinculada. Tus archivos no se borraron.', error: false, lastSync: null });
  });
}
