import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import * as repo from '@/db/repo';
import { confirmDialog } from '@/lib/dialog';
import { useStore } from '@/store';

export default function Groups() {
  const { groups, products, reload } = useStore();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  async function submit() {
    if (!name.trim()) return;
    if (editingId) await repo.renameGroup(editingId, name);
    else await repo.addGroup(name);
    setName('');
    setEditingId(null);
    await reload();
  }

  async function remove(id: number, groupName: string) {
    const count = products.filter((p) => p.group_id === id).length;
    const ok = await confirmDialog(
      'Eliminar grupo',
      `"${groupName}" se eliminará. ${count} producto(s) quedarán "Sin grupo".`,
    );
    if (!ok) return;
    await repo.deleteGroup(id);
    await reload();
  }

  return (
    <View style={styles.root}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nuevo grupo (Panes, Pasteles…)"
          onSubmitEditing={submit}
        />
        <Pressable style={styles.addBtn} onPress={submit}>
          <Text style={styles.addText}>{editingId ? 'Guardar' : 'Agregar'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(g) => String(g.id)}
        ListEmptyComponent={<Text style={styles.empty}>Aún no hay grupos.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                setEditingId(item.id);
                setName(item.name);
              }}
            >
              <Text style={styles.rowText}>{item.name}</Text>
              <Text style={styles.count}>
                {products.filter((p) => p.group_id === item.id).length} productos · toca para renombrar
              </Text>
            </Pressable>
            <Pressable onPress={() => remove(item.id, item.name)}>
              <Text style={styles.del}>🗑</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea', padding: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16 },
  addBtn: { backgroundColor: '#b3541e', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  rowText: { fontSize: 17, fontWeight: '600', color: '#2b2118' },
  count: { color: '#8a7a68', marginTop: 2 },
  del: { fontSize: 22, padding: 6 },
  empty: { textAlign: 'center', color: '#8a7a68', marginTop: 40 },
});
