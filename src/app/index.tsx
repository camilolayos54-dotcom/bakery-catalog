import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { OperationModal } from '@/components/OperationModal';
import { ProductCard } from '@/components/ProductCard';
import * as repo from '@/db/repo';
import { formatPrice } from '@/lib/money';
import { removeImage } from '@/lib/images';
import { useStore } from '@/store';

export default function Catalog() {
  const router = useRouter();
  const { groups, products, loaded, reload } = useStore();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [opOpen, setOpOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (groupId === null || p.group_id === groupId) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, groupId, query]);

  const selecting = selected.length > 0;
  const chosen = products.filter((p) => selected.includes(p.id));
  const total = chosen.reduce((sum, p) => sum + p.price_cents, 0);

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function removeSelected() {
    Alert.alert('Eliminar productos', `¿Eliminar ${selected.length} producto(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await repo.deleteProducts(selected);
          chosen.forEach((p) => removeImage(p.image_uri));
          setSelected([]);
          await reload();
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <TextInput style={styles.search} placeholder="Buscar producto…" value={query} onChangeText={setQuery} />
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todos" active={groupId === null} onPress={() => setGroupId(null)} />
          {groups.map((g) => (
            <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} />
          ))}
        </ScrollView>
        <Link href="/groups" style={styles.manage}>⚙︎</Link>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        extraData={selected}
        contentContainerStyle={[styles.grid, selecting && { paddingBottom: 170 }]}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            selected={selected.includes(item.id)}
            onLongPress={() => toggle(item.id)}
            onPress={() => (selecting ? toggle(item.id) : router.push(`/product/${item.id}`))}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loaded ? 'No hay productos. Toca + para agregar el primero.' : 'Cargando…'}
          </Text>
        }
      />

      {selecting ? (
        <View style={styles.bar}>
          <View style={styles.barTop}>
            <Text style={styles.barCount}>{selected.length} seleccionado(s)</Text>
            <Text style={styles.barTotal}>Suma: {formatPrice(total)}</Text>
          </View>
          <Text style={styles.barAvg}>
            Promedio: {formatPrice(Math.round(total / selected.length))}
          </Text>
          <View style={styles.barActions}>
            <BarBtn label="Operar precios" onPress={() => setOpOpen(true)} primary />
            <BarBtn label="Todos" onPress={() => setSelected(visible.map((p) => p.id))} />
            <BarBtn label="Eliminar" onPress={removeSelected} danger />
            <BarBtn label="Cancelar" onPress={() => setSelected([])} />
          </View>
        </View>
      ) : (
        <Pressable style={styles.fab} onPress={() => router.push('/product/new')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <OperationModal
        visible={opOpen}
        ids={selected}
        onClose={(changed) => {
          setOpOpen(false);
          if (changed) setSelected([]);
        }}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BarBtn({ label, onPress, primary, danger }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.barBtn, primary && styles.barBtnPrimary, danger && styles.barBtnDanger]}>
      <Text style={[styles.barBtnText, (primary || danger) && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea' },
  search: { margin: 12, marginBottom: 4, padding: 10, backgroundColor: '#fff', borderRadius: 10, fontSize: 16 },
  chipsRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#efdcc2' },
  chipActive: { backgroundColor: '#b3541e' },
  chipText: { color: '#5a3a1a', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  manage: { fontSize: 24, paddingHorizontal: 14, color: '#8a4b14' },
  grid: { padding: 6, paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 60, color: '#8a7a68', paddingHorizontal: 30 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#b3541e', alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 34, marginTop: -2 },
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#2b2118',
    padding: 14, paddingBottom: 22, gap: 6, borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barCount: { color: '#efdcc2', fontWeight: '600' },
  barTotal: { color: '#fff', fontSize: 22, fontWeight: '800' },
  barAvg: { color: '#c9b79c' },
  barActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  barBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#efdcc2', alignItems: 'center' },
  barBtnPrimary: { flex: 1.6, backgroundColor: '#b3541e' },
  barBtnDanger: { backgroundColor: '#c0392b' },
  barBtnText: { fontWeight: '700', color: '#5a3a1a', fontSize: 12 },
});
