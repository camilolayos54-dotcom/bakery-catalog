import { useMemo, useState } from 'react';
import {
  FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { useStore } from '@/store';

const PAD = 8;

export default function Catalog() {
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
      </View>

      <Text style={styles.hint}>
        Toca o mantén pulsado para añadir a la suma (+1) · mantén pulsado uno ya añadido para quitarlo
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
              onPress={() => addToCart(item.id)}
              onLongPress={() => (qty > 0 ? setQty(item.id, 0) : addToCart(item.id))}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loaded ? 'No hay productos. Agrégalos en la pestaña Editor.' : 'Cargando…'}
          </Text>
        }
      />
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
});
