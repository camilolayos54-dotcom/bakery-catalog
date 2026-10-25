// Native: writes a bundled seed photo into app storage and returns its file:// URI (null if it cannot).
import { Directory, File, Paths } from 'expo-file-system';

import { SEED_IMAGES } from './seedImages.data';

export function seedImageUri(key: string | undefined): string | null {
  const b64 = key ? SEED_IMAGES[key] : undefined;
  if (!key || !b64) return null;
  try {
    const dir = new Directory(Paths.document, 'images');
    if (!dir.exists) dir.create();
    const file = new File(dir, `${key}.jpg`);
    if (!file.exists) file.create();
    file.write(b64, { encoding: 'base64' });
    return file.uri;
  } catch {
    return null;
  }
}
