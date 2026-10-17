import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { useStore } from '@/store';

const PAD = 8;

export default function Catalog() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = Math.max(3, Math.floor(width / 125));
  const cardWidth = (width - PAD * 2) / columns;

  const { groups, products, loaded, cart, addToCart, setQty } = useStore();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (groupId === null || p.group_id === groupId) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, groupId, query]);

  const cartActive = Object.keys(cart).length > 0;

  return (
    <View style={styles.root}>
      <TextInput style={styles.search} placeholder="Buscar producto…" value={query} onChangeText={setQuery} />

      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todos" active={groupId === null} onPress={() => setGroupId(null)} />
          {groups.map((g) => (
            <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} />
          ))}
          <Chip label="＋ Grupo" onPress={() => router.push('/groups')} />
        </ScrollView>
      </View>

      <Text style={styles.hint}>
        {cartActive
          ? 'Toca para sumar +1 · mantén pulsado para quitar · ✎ para editar'
          : 'Mantén pulsado un producto para añadirlo a la suma · toca para editar'}
      </Text>

      <FlatList
        data={visible}
        key={columns}
        keyExtractor={(p) => String(p.id)}
        numColumns={columns}
        extraData={cart}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const qty = cart[item.id] ?? 0;
          return (
            <ProductCard
              product={item}
              width={cardWidth}
              qty={qty}
              onEdit={() => router.push(`/product/${item.id}`)}
              onPress={() => (cartActive ? addToCart(item.id) : router.push(`/product/${item.id}`))}
              onLongPress={() => (qty > 0 ? setQty(item.id, 0) : addToCart(item.id))}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loaded ? 'No hay productos. Usa + o "Varios" para agregar.' : 'Cargando…'}
          </Text>
        }
      />

      <View style={styles.fabs}>
        <Pressable style={[styles.fab, styles.fabSecondary]} onPress={() => router.push('/bulk')}>
          <Text style={styles.fabSmall}>Varios</Text>
        </Pressable>
        <Pressable style={styles.fab} onPress={() => router.push('/product/new')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea' },
  search: { margin: 10, marginBottom: 2, padding: 9, backgroundColor: '#fff', borderRadius: 10, fontSize: 15 },
  chipsRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#efdcc2' },
  chipActive: { backgroundColor: '#b3541e' },
  chipText: { color: '#5a3a1a', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 11, color: '#8a7a68', paddingHorizontal: 12, paddingBottom: 4 },
  grid: { padding: PAD, paddingBottom: 110 },
  empty: { textAlign: 'center', marginTop: 60, color: '#8a7a68', paddingHorizontal: 30 },
  fabs: { position: 'absolute', right: 16, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#b3541e',
    alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  fabSecondary: { width: 'auto', paddingHorizontal: 18, backgroundColor: '#8a4b14', borderRadius: 24, height: 48 },
  fabSmall: { color: '#fff', fontWeight: '700' },
  fabText: { color: '#fff', fontSize: 32, marginTop: -2 },
});
