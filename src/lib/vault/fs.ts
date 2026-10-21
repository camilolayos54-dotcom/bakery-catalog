// Android / iOS implementation. The folder is chosen with the system picker (Storage Access Framework).
import { Directory, File, Paths } from 'expo-file-system';

import { EMPTY_STATE, type OpenResult, type PickMode, type VaultFS, type VaultState } from './types';

type Entry = Directory | File;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function mimeFor(name: string) {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  // "application/octet-stream" keeps Android from appending an extension to .md files.
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

class NativeVault implements VaultFS {
  private listings = new Map<string, Map<string, Entry>>();

  constructor(
    private root: Directory,
    public name: string,
  ) {}

  private children(dir: Directory, k: string): Map<string, Entry> {
    let m = this.listings.get(k);
    if (!m) {
      m = new Map();
      for (const e of dir.list()) m.set(e.name, e);
      this.listings.set(k, m);
    }
    return m;
  }

  /** Walks (and optionally creates) the folders of `segments`. */
  private dirAt(segments: string[], create: boolean): Directory | null {
    let dir = this.root;
    for (let i = 0; i < segments.length; i++) {
      const k = segments.slice(0, i).join('/');
      const kids = this.children(dir, k);
      let next = kids.get(segments[i]);
      if (!next || !(next instanceof Directory)) {
        if (!create) return null;
        next = dir.createDirectory(segments[i]);
        kids.set(segments[i], next);
      }
      dir = next;
    }
    return dir;
  }

  private fileAt(path: string[]): File | null {
    const dir = this.dirAt(path.slice(0, -1), false);
    if (!dir) return null;
    const e = this.children(dir, path.slice(0, -1).join('/')).get(path[path.length - 1]);
    return e instanceof File ? e : null;
  }

  async listAll(): Promise<string[][]> {
    this.listings.clear();
    const out: string[][] = [];
    const walk = (dir: Directory, prefix: string[]) => {
      const kids = this.children(dir, prefix.join('/'));
      for (const [name, e] of kids) {
        if (name.startsWith('.')) continue;
        if (e instanceof Directory) walk(e, [...prefix, name]);
        else out.push([...prefix, name]);
      }
    };
    walk(this.root, []);
    return out;
  }

  async readText(path: string[]) {
    const f = this.fileAt(path);
    if (!f) throw new Error(`No existe ${path.join('/')}`);
    return f.text();
  }

  async readBytes(path: string[]) {
    const f = this.fileAt(path);
    if (!f) throw new Error(`No existe ${path.join('/')}`);
    return f.bytes();
  }

  private write(path: string[], content: string | Uint8Array) {
    const name = path[path.length - 1];
    const dirPath = path.slice(0, -1);
    const dir = this.dirAt(dirPath, true)!;
    const kids = this.children(dir, dirPath.join('/'));
    let file = kids.get(name);
    if (!(file instanceof File)) {
      file = dir.createFile(name, mimeFor(name));
      if (file.name !== name) {
        try {
          file.rename(name);
        } catch {}
      }
      kids.set(name, file);
    }
    file.write(content);
  }

  async writeText(path: string[], text: string) {
    this.write(path, text);
  }

  async writeBytes(path: string[], bytes: Uint8Array) {
    this.write(path, bytes);
  }

  async exists(path: string[]) {
    return this.fileAt(path) != null;
  }

  async remove(path: string[]) {
    const f = this.fileAt(path);
    if (!f) return;
    f.delete();
    const dirPath = path.slice(0, -1);
    const dir = this.dirAt(dirPath, false);
    if (dir) this.children(dir, dirPath.join('/')).delete(path[path.length - 1]);
  }
}

// ------------------------------------------------------------ persistence

type Saved = { uri: string; name: string; state: VaultState };
const cfgFile = () => new File(Paths.document, 'vault.json');

async function readCfg(): Promise<Saved | null> {
  try {
    const f = cfgFile();
    if (!f.exists) return null;
    return JSON.parse(await f.text()) as Saved;
  } catch {
    return null;
  }
}

function writeCfg(cfg: Saved) {
  const f = cfgFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(cfg));
}

export function isVaultSupported() {
  return true;
}

/** Opens the system folder picker. For "create", makes a "Bakery" folder inside the chosen one. */
export async function pickVault(mode: PickMode): Promise<VaultFS | null> {
  let picked: Directory;
  try {
    picked = await Directory.pickDirectoryAsync();
  } catch {
    return null; // cancelled
  }
  let root = picked;
  if (mode === 'create') {
    const existing = picked.list().find((e) => e instanceof Directory && e.name === 'Bakery');
    root = existing instanceof Directory ? existing : picked.createDirectory('Bakery');
  }
  writeCfg({ uri: root.uri, name: root.name, state: EMPTY_STATE });
  return new NativeVault(root, root.name);
}

export async function openSavedVault(): Promise<OpenResult> {
  const cfg = await readCfg();
  if (!cfg) return { status: 'none' };
  try {
    const root = new Directory(cfg.uri);
    root.list(); // throws when the permission is gone
    return { status: 'ok', fs: new NativeVault(root, cfg.name) };
  } catch {
    return { status: 'needs-permission', name: cfg.name };
  }
}

/** Asks the user to pick the folder again after Android revoked access. */
export async function reconnectVault(): Promise<VaultFS | null> {
  const cfg = await readCfg();
  let picked: Directory;
  try {
    picked = await Directory.pickDirectoryAsync(cfg?.uri);
  } catch {
    return null;
  }
  writeCfg({ uri: picked.uri, name: picked.name, state: cfg?.state ?? EMPTY_STATE });
  return new NativeVault(picked, picked.name);
}

export async function forgetVault() {
  try {
    const f = cfgFile();
    if (f.exists) f.delete();
  } catch {}
}

export async function loadVaultState(): Promise<VaultState> {
  return (await readCfg())?.state ?? { ...EMPTY_STATE, managed: {}, images: {}, imageSizes: {} };
}

export async function saveVaultState(state: VaultState) {
  const cfg = await readCfg();
  if (cfg) writeCfg({ ...cfg, state });
}
