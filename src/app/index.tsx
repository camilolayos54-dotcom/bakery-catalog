import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { useStore } from '@/store';

export default function Catalog() {
  const router = useRouter();
  const { groups, products, loaded } = useStore();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (groupId === null || p.group_id === groupId) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, groupId, query]);

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.search}
        placeholder="Buscar producto…"
        value={query}
        onChangeText={setQuery}
      />
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
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loaded ? 'No hay productos. Toca + para agregar el primero.' : 'Cargando…'}
          </Text>
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push('/product/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
});
