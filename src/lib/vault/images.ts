// Android / iOS: covers live as files in the app's own storage.
import { Directory, File, Paths } from 'expo-file-system';

export async function readLocalImage(uri: string): Promise<Uint8Array | null> {
  try {
    const f = new File(uri);
    return f.exists ? await f.bytes() : null;
  } catch {
    return null;
  }
}

/** Saves a cover imported from the Bakery folder and returns the URI the app should use. */
export async function saveImportedImage(key: string, ext: string, bytes: Uint8Array): Promise<string> {
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create();
  const f = new File(dir, `v_${key}.${ext}`);
  if (!f.exists) f.create();
  f.write(bytes);
  return f.uri;
}
