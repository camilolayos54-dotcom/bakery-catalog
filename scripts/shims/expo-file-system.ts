// Test-only stand-in for "expo-file-system" (new File/Directory API) backed by Node's fs in a temp folder.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bakery-fs-'));

export const Paths = { document: root };

type Part = string | Directory;
const join = (parts: Part[]) => path.join(...parts.map((p) => (typeof p === 'string' ? p : p.path)));

export class Directory {
  path: string;
  constructor(...parts: Part[]) {
    this.path = join(parts);
  }
  get exists() {
    return fs.existsSync(this.path);
  }
  create() {
    fs.mkdirSync(this.path, { recursive: true });
  }
}

export class File {
  path: string;
  constructor(...parts: Part[]) {
    this.path = join(parts);
  }
  get uri() {
    return 'file://' + this.path.replace(/\\/g, '/');
  }
  get exists() {
    return fs.existsSync(this.path);
  }
  create() {
    fs.writeFileSync(this.path, '');
  }
  write(content: string | Uint8Array, options?: { encoding?: string }) {
    fs.writeFileSync(this.path, typeof content === 'string' ? Buffer.from(content, options?.encoding === 'base64' ? 'base64' : 'utf8') : content);
  }
  delete() {
    fs.rmSync(this.path, { force: true });
  }
}
