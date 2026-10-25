// Web: seed photos live in the catalog itself as data URIs.
import { SEED_IMAGES } from './seedImages.data';

export function seedImageUri(key: string | undefined): string | null {
  const b64 = key ? SEED_IMAGES[key] : undefined;
  return b64 ? `data:image/jpeg;base64,${b64}` : null;
}
