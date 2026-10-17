import * as ImagePicker from 'expo-image-picker';

/** On web there is no camera/app storage: pick a file and keep it as a data URI. */
export async function pickCover(_source: 'camera' | 'gallery'): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.5,
    base64: true,
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  return a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
}

export function removeImage(_uri: string | null) {}
