// Windows / browser implementation (Chrome and Edge): File System Access API.
import { EMPTY_STATE, type OpenResult, type PickMode, type VaultFS, type VaultState } from './types';

type Dir = FileSystemDirectoryHandle;

class WebVault implements VaultFS {
  constructor(
    private root: Dir,
    public name: string,
  ) {}

  private async dirAt(segments: string[], create: boolean): Promise<Dir | null> {
    let dir = this.root;
    for (const seg of segments) {
      try {
        dir = await dir.getDirectoryHandle(seg, { create });
      } catch {
        return null;
      }
    }
    return dir;
  }

  private async fileAt(path: string[], create = false) {
    const dir = await this.dirAt(path.slice(0, -1), create);
    if (!dir) return null;
    try {
      return await dir.getFileHandle(path[path.length - 1], { create });
    } catch {
      return null;
    }
  }

  async listAll(): Promise<string[][]> {
    const out: string[][] = [];
    const walk = async (dir: Dir, prefix: string[]) => {
      for await (const [name, handle] of (dir as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
        if (name.startsWith('.')) continue;
        if (handle.kind === 'directory') await walk(handle as Dir, [...prefix, name]);
        else out.push([...prefix, name]);
      }
    };
    await walk(this.root, []);
    return out;
  }

  async readText(path: string[]) {
    const h = await this.fileAt(path);
    if (!h) throw new Error(`No existe ${path.join('/')}`);
    return (await h.getFile()).text();
  }

  async readBytes(path: string[]) {
    const h = await this.fileAt(path);
    if (!h) throw new Error(`No existe ${path.join('/')}`);
    return new Uint8Array(await (await h.getFile()).arrayBuffer());
  }

  private async write(path: string[], data: string | Uint8Array) {
    const h = await this.fileAt(path, true);
    if (!h) throw new Error(`No se pudo crear ${path.join('/')}`);
    const w = await (h as any).createWritable();
    await w.write(data);
    await w.close();
  }

  writeText(path: string[], text: string) {
    return this.write(path, text);
  }

  writeBytes(path: string[], bytes: Uint8Array) {
    return this.write(path, bytes);
  }

  async exists(path: string[]) {
    return (await this.fileAt(path)) != null;
  }

  async remove(path: string[]) {
    const dir = await this.dirAt(path.slice(0, -1), false);
    if (!dir) return;
    try {
      await dir.removeEntry(path[path.length - 1]);
    } catch {}
  }
}

// ------------------------------------------------------------ persistence

const DB_NAME = 'bakery-vault';
const STORE = 'kv';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(k: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(k);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}

async function idbSet(k: string, v: unknown) {
  const db = await idb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(k: string) {
  const db = await idb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const STATE_KEY = 'bakery-vault-state';

export function isVaultSupported() {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

async function remember(root: Dir) {
  await idbSet('handle', root);
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(EMPTY_STATE));
  } catch {}
}

/** Must run inside a click: opens the folder picker. For "create" makes "Bakery" inside it. */
export async function pickVault(mode: PickMode): Promise<VaultFS | null> {
  let picked: Dir;
  try {
    picked = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return null; // cancelled
  }
  const root = mode === 'create' ? await picked.getDirectoryHandle('Bakery', { create: true }) : picked;
  await remember(root);
  return new WebVault(root, root.name);
}

async function permission(h: Dir, request: boolean) {
  const opts = { mode: 'readwrite' };
  if ((await (h as any).queryPermission(opts)) === 'granted') return true;
  return request ? (await (h as any).requestPermission(opts)) === 'granted' : false;
}

export async function openSavedVault(): Promise<OpenResult> {
  if (!isVaultSupported()) return { status: 'none' };
  const h = await idbGet<Dir>('handle');
  if (!h) return { status: 'none' };
  try {
    if (await permission(h, false)) return { status: 'ok', fs: new WebVault(h, h.name) };
  } catch {}
  return { status: 'needs-permission', name: h.name };
}

/** Must run inside a click: browsers ask again for permission after a restart. */
export async function reconnectVault(): Promise<VaultFS | null> {
  const h = await idbGet<Dir>('handle');
  if (!h) return null;
  try {
    return (await permission(h, true)) ? new WebVault(h, h.name) : null;
  } catch {
    return null;
  }
}

export async function forgetVault() {
  await idbDel('handle');
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {}
}

export async function loadVaultState(): Promise<VaultState> {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as VaultState;
  } catch {}
  return { managed: {}, images: {}, imageSizes: {} };
}

export async function saveVaultState(state: VaultState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
}
