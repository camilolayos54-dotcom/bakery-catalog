// Web only: browsers keep the catalog in localStorage (about 5-10 MB), so photos must be small.
// A phone photo can be 1 MB or more; a 480 px JPEG is ~20-40 KB, plenty for a product card.

const MAX_SIDE = 480;
const QUALITY = 0.75;

/** Shrinks any image data URI to a small JPEG data URI. Falls back to the original if it cannot be decoded. */
export async function shrinkDataUri(src: string, maxSide = MAX_SIDE, quality = QUALITY): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('no se pudo leer la imagen'));
      i.src = src;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;
    ctx.fillStyle = '#ffffff'; // PNGs with transparency become white instead of black
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return src;
  }
}

export const base64ToDataUri = (b64: string, mime = 'image/jpeg') => `data:${mime};base64,${b64}`;
