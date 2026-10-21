// Web: covers are stored as data URIs inside the catalog.

function toBase64(bytes: Uint8Array) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export async function readLocalImage(uri: string): Promise<Uint8Array | null> {
  const m = uri.match(/^data:[^;]*;base64,(.*)$/);
  if (!m) return null;
  const bin = atob(m[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function saveImportedImage(_key: string, ext: string, bytes: Uint8Array): Promise<string> {
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${toBase64(bytes)}`;
}
