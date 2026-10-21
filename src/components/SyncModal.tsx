import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { confirmDialog } from '@/lib/dialog';
import { exportAndShareData, getSyncDirectoryPath, importDataFromFile } from '@/lib/sync';
import { isVaultSupported } from '@/lib/vault/fs';
import { linkVault, reconnectVault, syncNow, unlinkVault, useVault } from '@/lib/vault/sync';
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
  const vault = useVault();

  const handleLinkExisting = async () => {
    if (products.length > 0) {
      const ok = await confirmDialog(
        'Elegir carpeta existente',
        'Se cargarán los productos de esa carpeta y REEMPLAZARÁN los actuales de la app (se guarda una copia de seguridad). ¿Continuar?',
        'Continuar',
      );
      if (!ok) return;
    }
    await linkVault('existing');
  };

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
          <ScrollView showsVerticalScrollIndicator={false}>
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

          <View style={styles.vaultBox}>
            <Text style={styles.vaultTitle}>📁 Carpeta Bakery (como Obsidian)</Text>
            {!isVaultSupported() ? (
              <Text style={styles.vaultText}>
                Para usar una carpeta en el PC abre la app en Chrome o Edge. En el celular funciona directamente.
              </Text>
            ) : vault.linked ? (
              <>
                <Text style={styles.vaultText}>
                  Vinculada: <Text style={styles.bold}>{vault.name}</Text>
                  {'\n'}Lo que cambies en la app se guarda en la carpeta, y lo que edites en los archivos se
                  carga al abrir la app o al pulsar Sincronizar.
                </Text>
                {vault.needsPermission ? (
                  <TouchableOpacity style={[styles.vaultBtn, styles.vaultBtnPrimary]} onPress={() => void reconnectVault()}>
                    <Text style={styles.vaultBtnTextPrimary}>Permitir acceso a la carpeta</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.vaultRow}>
                    <TouchableOpacity
                      style={[styles.vaultBtn, styles.vaultBtnPrimary, { flex: 2 }]}
                      onPress={() => void syncNow()}
                      disabled={vault.busy}
                    >
                      <Text style={styles.vaultBtnTextPrimary}>{vault.busy ? 'Sincronizando…' : '🔄 Sincronizar ahora'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.vaultBtn} onPress={() => void unlinkVault()} disabled={vault.busy}>
                      <Text style={styles.vaultBtnText}>Desvincular</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.vaultText}>
                  Una carpeta con un archivo .md por producto (precio, promoción y foto). Puedes editarla desde el PC
                  o con Obsidian y la app la carga sola.
                </Text>
                <View style={styles.vaultRow}>
                  <TouchableOpacity style={[styles.vaultBtn, styles.vaultBtnPrimary]} onPress={() => void linkVault('create')}>
                    <Text style={styles.vaultBtnTextPrimary}>Crear carpeta Bakery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.vaultBtn} onPress={() => void handleLinkExisting()}>
                    <Text style={styles.vaultBtnText}>Elegir existente</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {vault.message ? (
              <Text style={[styles.vaultMsg, vault.error && { color: '#991b1b' }]}>{vault.message}</Text>
            ) : null}
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
          </ScrollView>
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
    maxHeight: '94%',
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
  vaultBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  vaultTitle: { fontSize: 15, fontWeight: '800', color: '#78350f' },
  vaultText: { fontSize: 12, color: '#78350f', lineHeight: 17 },
  vaultRow: { flexDirection: 'row', gap: 8 },
  vaultBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#fde68a',
    alignItems: 'center',
  },
  vaultBtnPrimary: { backgroundColor: '#b45309' },
  vaultBtnText: { fontWeight: '700', color: '#78350f', fontSize: 13 },
  vaultBtnTextPrimary: { fontWeight: '800', color: '#ffffff', fontSize: 13 },
  vaultMsg: { fontSize: 12, color: '#166534', fontWeight: '600' },
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
