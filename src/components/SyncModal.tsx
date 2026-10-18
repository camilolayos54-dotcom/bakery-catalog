import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { exportAndShareData, getSyncDirectoryPath, importDataFromFile } from '@/lib/sync';
import { useStore } from '@/store';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SyncModal({ visible, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const products = useStore((s) => s.products);
  const groups = useStore((s) => s.groups);

  const handleExport = async () => {
    setLoading(true);
    setStatusMessage(null);
    setIsError(false);
    try {
      const res = await exportAndShareData();
      setIsError(!res.success);
      setStatusMessage(res.message);
      if (res.success && Platform.OS !== 'web') {
        Alert.alert('Exportación Exitosa', res.message);
      }
    } catch (e: any) {
      setIsError(true);
      setStatusMessage(`Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStatusMessage(null);
    setIsError(false);
    try {
      const res = await importDataFromFile();
      setIsError(!res.success);
      setStatusMessage(res.message);
      if (res.success) {
        Alert.alert('Restauración Completa', res.message);
      }
    } catch (e: any) {
      setIsError(true);
      setStatusMessage(`Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🔄 Sincronización y Respaldo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Pasa tus productos, fotos, precios y frecuencias entre tu celular y el PC sin perder nada.
          </Text>

          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>
              📦 Datos actuales: <Text style={styles.bold}>{products.length} productos</Text> en{' '}
              <Text style={styles.bold}>{groups.length} categorías</Text>
            </Text>
          </View>

          <View style={styles.actions}>
            {/* Botón Exportar */}
            <TouchableOpacity
              style={[styles.btn, styles.exportBtn]}
              onPress={handleExport}
              disabled={loading}
            >
              <Text style={styles.btnIcon}>📤</Text>
              <View style={styles.btnContent}>
                <Text style={styles.btnTitle}>
                  {Platform.OS === 'web' ? 'Descargar Respaldo (.json)' : 'Exportar y Compartir Datos'}
                </Text>
                <Text style={styles.btnDesc}>
                  {Platform.OS === 'web'
                    ? 'Guarda el archivo en tu PC para pasarlo a tu celular.'
                    : 'Comparte por WhatsApp a tu PC o guarda en tu celular.'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Botón Importar */}
            <TouchableOpacity
              style={[styles.btn, styles.importBtn]}
              onPress={handleImport}
              disabled={loading}
            >
              <Text style={styles.btnIcon}>📥</Text>
              <View style={styles.btnContent}>
                <Text style={styles.btnTitle}>Importar Copia de Seguridad</Text>
                <Text style={styles.btnDesc}>
                  Selecciona un archivo .json de respaldo para actualizar toda la app.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#d97706" />
              <Text style={styles.loadingText}>Procesando datos...</Text>
            </View>
          )}

          {statusMessage && !loading && (
            <View style={[styles.msgBox, isError ? styles.msgBoxError : styles.msgBoxSuccess]}>
              <Text style={[styles.msgText, isError ? styles.msgTextError : styles.msgTextSuccess]}>
                {statusMessage}
              </Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 ¿Cómo pasar datos al PC?</Text>
            <Text style={styles.infoText}>
              1. Toca <Text style={styles.bold}>Exportar</Text> y elige WhatsApp (enviar a tu propio chat) o Google Drive.
            </Text>
            <Text style={styles.infoText}>
              2. En el PC, guarda el archivo en la carpeta <Text style={styles.bold}>data_sync/</Text> del proyecto o impórtalo en la web.
            </Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  statsBadge: {
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  statsText: {
    fontSize: 12,
    color: '#92400e',
  },
  bold: {
    fontWeight: '700',
  },
  actions: {
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  exportBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  importBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  btnIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  btnContent: {
    flex: 1,
  },
  btnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  btnDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '600',
  },
  msgBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  msgBoxSuccess: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  msgBoxError: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  msgText: {
    fontSize: 12,
    textAlign: 'center',
  },
  msgTextSuccess: {
    color: '#166534',
    fontWeight: '600',
  },
  msgTextError: {
    color: '#991b1b',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  doneBtn: {
    marginTop: 16,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
