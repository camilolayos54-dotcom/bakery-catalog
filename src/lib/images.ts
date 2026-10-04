import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/** Opens camera or gallery (square crop) and copies the photo into app storage. */
export async function pickCover(source: 'camera' | 'gallery'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;

  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${Date.now()}.jpg`);
  new File(result.assets[0].uri).copy(dest);
  return dest.uri;
}

export function removeImage(uri: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}
