import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import * as repo from '@/db/repo';
import { confirmDialog, notify } from '@/lib/dialog';
import { useStore } from '@/store';

export default function Groups() {
  const { groups, subcategories, products, reload, seedCatalog } = useStore();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Estado para desplegar subcategorías por grupo
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState('');

  async function submit() {
    if (!name.trim()) return;
    if (editingId) {
      await repo.renameGroup(editingId, name);
    } else {
      await repo.addGroup(name);
    }
    setName('');
    setEditingId(null);
    await reload();
  }

  function cancelEdit() {
    setName('');
    setEditingId(null);
  }

  async function handleMove(id: number, direction: 'up' | 'down') {
    await repo.moveGroup(id, direction);
    await reload();
  }

  async function remove(id: number, groupName: string) {
    const count = products.filter((p) => p.group_id === id).length;
    const ok = await confirmDialog(
      'Eliminar categoría',
      `"${groupName}" se eliminará junto con sus subcategorías. ${count} producto(s) quedarán "Sin grupo".`,
    );
    if (!ok) return;
    await repo.deleteGroup(id);
    await reload();
  }

  async function handleAddSub(groupId: number) {
    if (!newSubName.trim()) return;
    await repo.addSubcategory(groupId, newSubName);
    setNewSubName('');
    await reload();
  }

  async function handleRemoveSub(subId: number, subName: string) {
    const ok = await confirmDialog(
      'Eliminar subcategoría',
      `¿Deseas eliminar "${subName}"? Los productos volverán a quedar sin subcategoría asignada.`,
    );
    if (!ok) return;
    await repo.deleteSubcategory(subId);
    await reload();
  }

  async function handleResetToInitial() {
    const ok = await confirmDialog(
      'Restaurar catálogo completo',
      '¿Deseas restaurar todas las categorías, subcategorías y los productos iniciales? Se reinicializará la base de datos.',
    );
    if (!ok) return;
    await seedCatalog(true);
    notify('Catálogo restaurado con éxito');
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Categorías y Subcategorías</Text>
      <Text style={styles.subtitle}>
        Crea, reordena con ▲ y ▼, o toca una categoría para gestionar sus subcategorías.
      </Text>

      {/* Agregar o renombrar categoría principal */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={editingId ? 'Renombrar categoría...' : 'Nueva categoría principal...'}
          onSubmitEditing={submit}
        />
        <Pressable style={styles.addBtn} onPress={submit}>
          <Text style={styles.addText}>{editingId ? 'Guardar' : 'Agregar'}</Text>
        </Pressable>
        {editingId ? (
          <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
            <Text style={styles.cancelText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => String(g.id)}
        ListEmptyComponent={<Text style={styles.empty}>Aún no hay categorías.</Text>}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === groups.length - 1;
          const isEditing = editingId === item.id;
          const isExpanded = expandedGroupId === item.id;
          const productCount = products.filter((p) => p.group_id === item.id).length;
          const subs = subcategories.filter((s) => s.group_id === item.id);

          return (
            <View style={[styles.card, isEditing && styles.cardEditing]}>
              <View style={styles.row}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>

                <Pressable
                  style={{ flex: 1, paddingVertical: 4 }}
                  onPress={() => {
                    setExpandedGroupId(isExpanded ? null : item.id);
                  }}
                >
                  <Text style={styles.rowText}>{item.name}</Text>
                  <Text style={styles.count}>
                    {productCount} producto(s) · {subs.length} subcategoría(s) {isExpanded ? '▲' : '▼'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.renameSmall}
                  onPress={() => {
                    setEditingId(item.id);
                    setName(item.name);
                  }}
                >
                  <Text style={styles.renameSmallText}>✏️</Text>
                </Pressable>

                <View style={styles.reorderActions}>
                  <Pressable
                    disabled={isFirst}
                    onPress={() => handleMove(item.id, 'up')}
                    style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
                  >
                    <Text style={[styles.moveIcon, isFirst && styles.moveIconDisabled]}>▲</Text>
                  </Pressable>
                  <Pressable
                    disabled={isLast}
                    onPress={() => handleMove(item.id, 'down')}
                    style={[styles.moveBtn, isLast && styles.moveBtnDisabled]}
                  >
                    <Text style={[styles.moveIcon, isLast && styles.moveIconDisabled]}>▼</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => remove(item.id, item.name)} style={styles.delBtn}>
                  <Text style={styles.del}>🗑</Text>
                </Pressable>
              </View>

              {/* Panel de Subcategorías Desplegable */}
              {isExpanded ? (
                <View style={styles.subPanel}>
                  <Text style={styles.subTitle}>Subcategorías de {item.name}:</Text>
                  <View style={styles.subsWrap}>
                    {subs.map((s) => (
                      <View key={s.id} style={styles.subPill}>
                        <Text style={styles.subPillText}>{s.name}</Text>
                        <Pressable onPress={() => handleRemoveSub(s.id, s.name)}>
                          <Text style={styles.subPillDel}> ✕</Text>
                        </Pressable>
                      </View>
                    ))}
                    {subs.length === 0 ? (
                      <Text style={styles.noSubsText}>Sin subcategorías aún.</Text>
                    ) : null}
                  </View>

                  {/* Input para agregar nueva subcategoría */}
                  <View style={styles.addSubRow}>
                    <TextInput
                      style={styles.subInput}
                      value={newSubName}
                      onChangeText={setNewSubName}
                      placeholder="Nueva subcategoría (ej. 400ml, Croissants...)"
                      onSubmitEditing={() => handleAddSub(item.id)}
                    />
                    <Pressable style={styles.addSubBtn} onPress={() => handleAddSub(item.id)}>
                      <Text style={styles.addSubBtnText}>＋ Añadir</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable style={styles.resetBtn} onPress={handleResetToInitial}>
              <Text style={styles.resetBtnText}>🔄 Restaurar catálogo completo con subcategorías</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea', padding: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#5a3a1a', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#8a7a68', marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#e6d3bd' },
  addBtn: { backgroundColor: '#b3541e', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { backgroundColor: '#d1bca5', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  cancelText: { color: '#4a3319', fontWeight: '700', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#faecd9',
    overflow: 'hidden',
  },
  cardEditing: {
    borderColor: '#b3541e',
    backgroundColor: '#fff8f0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1e0c8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderText: {
    fontWeight: '800',
    color: '#8a4b14',
    fontSize: 13,
  },
  rowText: { fontSize: 16, fontWeight: '700', color: '#2b2118' },
  count: { color: '#8a7a68', fontSize: 12, marginTop: 2 },
  renameSmall: { padding: 6, marginRight: 4 },
  renameSmallText: { fontSize: 14 },
  reorderActions: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 4,
  },
  moveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f6ecdd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnDisabled: { opacity: 0.3 },
  moveIcon: { fontSize: 14, color: '#703c10', fontWeight: '900' },
  moveIconDisabled: { color: '#a89886' },
  delBtn: { padding: 6 },
  del: { fontSize: 18 },

  subPanel: {
    backgroundColor: '#faf3eb',
    borderTopWidth: 1,
    borderColor: '#f0e1d0',
    padding: 10,
  },
  subTitle: { fontSize: 12, fontWeight: '700', color: '#6e3c12', marginBottom: 6 },
  subsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eeddcb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  subPillText: { fontSize: 12, color: '#5a3a1a', fontWeight: '600' },
  subPillDel: { fontSize: 12, color: '#c0392b', fontWeight: '800' },
  noSubsText: { fontSize: 12, color: '#a09080', fontStyle: 'italic' },
  addSubRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  subInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#e2cfb7',
  },
  addSubBtn: {
    backgroundColor: '#6e3c12',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  addSubBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  empty: { textAlign: 'center', color: '#8a7a68', marginTop: 40 },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9d7c3',
    alignItems: 'center',
  },
  resetBtn: {
    backgroundColor: '#eeddcb',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#6e3c12',
    fontWeight: '700',
    fontSize: 14,
  },
});
