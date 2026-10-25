import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as LegacyFS from 'expo-file-system/legacy';

import * as repo from '@/db/repo';
import { base64ToDataUri, shrinkDataUri } from '@/lib/shrink';
import { useStore } from '@/store';
import type { BackupPayload, ExportedProduct } from '@/types';

function formatDateTag(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** Obtiene la ruta de la carpeta específica de datos y asegura que exista */
export async function getSyncDirectoryPath(): Promise<string> {
  if (Platform.OS === 'web') return 'Descargas del navegador / Carpeta del Proyecto';
  const baseDir = LegacyFS.documentDirectory || '';
  const syncDir = `${baseDir}bakery_data/`;
  try {
    const info = await LegacyFS.getInfoAsync(syncDir);
    if (!info.exists) {
      await LegacyFS.makeDirectoryAsync(syncDir, { intermediates: true });
    }
  } catch {}
  return syncDir;
}

/**
 * Exporta todos los datos (categorías, subcategorías, productos, precios, fotos y frecuencias)
 * en un paquete .json autosuficiente y abre el diálogo para compartirlo por WhatsApp, Drive o guardarlo en PC.
 */
export async function exportAndShareData(): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    const rawData = await repo.exportAllData();
    const dateTag = formatDateTag();

    const exportedProducts: ExportedProduct[] = [];

    // En dispositivos móviles, empaquetamos las imágenes locales en Base64 para que el archivo sea 100% portable
    for (const prod of rawData.products) {
      const expProd: ExportedProduct = { ...prod };
      if (Platform.OS !== 'web' && prod.image_uri && prod.image_uri.startsWith('file://')) {
        try {
          const imgInfo = await LegacyFS.getInfoAsync(prod.image_uri);
          if (imgInfo.exists) {
            const b64 = await LegacyFS.readAsStringAsync(prod.image_uri, {
              encoding: LegacyFS.EncodingType.Base64,
            });
            expProd.image_base64 = b64;
          }
        } catch (err) {
          console.warn('No se pudo convertir imagen a base64 para producto:', prod.name, err);
        }
      }
      exportedProducts.push(expProd);
    }

    const payload: BackupPayload = {
      ...rawData,
      products: exportedProducts,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const fileName = `panaderia_respaldo_${dateTag}.json`;

    if (Platform.OS === 'web') {
      // Descarga directa en navegador Web (PC)
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        message: `Archivo ${fileName} descargado exitosamente en tu PC.`,
      };
    } else {
      // Dispositivo Android / iOS: guardar en carpeta bakery_data y abrir menú compartir
      const syncDir = await getSyncDirectoryPath();
      const targetPath = `${syncDir}${fileName}`;
      const latestPath = `${syncDir}catalog_latest.json`;

      await LegacyFS.writeAsStringAsync(targetPath, jsonString, {
        encoding: LegacyFS.EncodingType.UTF8,
      });
      // Mantener siempre una copia fija "catalog_latest.json" para sincronización rápida
      await LegacyFS.writeAsStringAsync(latestPath, jsonString, {
        encoding: LegacyFS.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(targetPath, {
          mimeType: 'application/json',
          dialogTitle: 'Compartir o guardar datos de la panadería',
          UTI: 'public.json',
        });
      }

      return {
        success: true,
        message: `Guardado en ${targetPath}. Puedes compartirlo por WhatsApp, Drive o pasarlo al PC.`,
        filePath: targetPath,
      };
    }
  } catch (error: any) {
    console.error('Error al exportar datos:', error);
    return {
      success: false,
      message: `Error al exportar: ${error?.message || error}`,
    };
  }
}

/**
 * Importa un archivo .json de respaldo, restaura productos, fotos, categorías y frecuencias,
 * y recarga la aplicación en tiempo real.
 */
export async function importDataFromFile(): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    let jsonText: string | null = null;

    if (Platform.OS === 'web') {
      // Selector de archivo en Web
      jsonText = await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = (re) => resolve(re.target?.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };
        input.click();
      });
    } else {
      // Selector de archivo en Android / iOS
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return { success: false, message: 'Operación cancelada.' };
      }

      const pickedUri = res.assets[0].uri;
      jsonText = await LegacyFS.readAsStringAsync(pickedUri, {
        encoding: LegacyFS.EncodingType.UTF8,
      });
    }

    if (!jsonText) {
      return { success: false, message: 'No se seleccionó ningún archivo de respaldo.' };
    }

    const payload = JSON.parse(jsonText) as BackupPayload;

    // Validación básica de estructura
    if (!payload.groups || !payload.products) {
      return {
        success: false,
        message: 'El archivo seleccionado no tiene el formato válido de respaldo de la panadería.',
      };
    }

    // Restaurar imágenes en disco si vienen en Base64 en un dispositivo móvil
    if (Platform.OS !== 'web') {
      const baseDir = LegacyFS.documentDirectory || '';
      const imgDir = `${baseDir}images/`;
      try {
        const info = await LegacyFS.getInfoAsync(imgDir);
        if (!info.exists) {
          await LegacyFS.makeDirectoryAsync(imgDir, { intermediates: true });
        }
      } catch {}

      for (const prod of payload.products) {
        if (prod.image_base64) {
          try {
            const destPath = `${imgDir}prod_${prod.id}_${Date.now()}.jpg`;
            await LegacyFS.writeAsStringAsync(destPath, prod.image_base64, {
              encoding: LegacyFS.EncodingType.Base64,
            });
            prod.image_uri = destPath;
          } catch (err) {
            console.warn('No se pudo restaurar imagen para:', prod.name, err);
          }
        }
      }
    }

    // Web: el navegador guarda el catálogo en localStorage (~5-10 MB). Un respaldo del celular trae las fotos
    // como Base64 (decenas de MB) y rutas de Android que aquí no existen: se convierten en miniaturas ligeras.
    if (Platform.OS === 'web') {
      for (const prod of payload.products) {
        if (prod.image_base64) {
          prod.image_uri = await shrinkDataUri(base64ToDataUri(prod.image_base64));
        } else if (prod.image_uri && !/^(data:|https?:|blob:)/.test(prod.image_uri)) {
          prod.image_uri = null; // ruta de archivo de otro dispositivo
        }
        delete prod.image_base64;
      }
    }

    // Guardar en la base de datos (SQLite en Android o LocalStorage en Web)
    await repo.importAllData(payload);

    // Recargar el almacén en memoria
    await useStore.getState().reload();

    return {
      success: true,
      message: `¡Copia restaurada con éxito! Se cargaron ${payload.products.length} productos y ${payload.groups.length} categorías.`,
      count: payload.products.length,
    };
  } catch (error: any) {
    console.error('Error al importar datos:', error);
    return {
      success: false,
      message: `Error al importar archivo: ${error?.message || error}`,
    };
  }
}
