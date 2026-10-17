import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hasPromo, promoLabel } from '@/lib/cart';
import { formatPrice } from '@/lib/money';
import { useStore } from '@/store';

export default function Editor() {
  const router = useRouter();
  const { groups, products } = useStore();
  const [groupId, setGroupId] = useState<number | null | 'none'>(null);
  const [query, setQuery] = useState('');

  const groupName = (id: number | null) => groups.find((g) => g.id === id)?.name ?? 'Sin grupo';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (groupId === null || (groupId === 'none' ? p.group_id === null : p.group_id === groupId)) &&
        (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, groupId, query]);

  return (
    <View style={styles.root}>
      <View style={styles.actions}>
        <Btn label="＋ Producto" primary onPress={() => router.push('/editor/new')} />
        <Btn label="Varios" onPress={() => router.push('/editor/bulk')} />
        <Btn label="Grupos" onPress={() => router.push('/editor/groups')} />
      </View>

      <TextInput style={styles.search} placeholder="Buscar producto…" value={query} onChangeText={setQuery} />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todos" active={groupId === null} onPress={() => setGroupId(null)} />
          {groups.map((g) => (
            <Chip key={g.id} label={g.name} active={groupId === g.id} onPress={() => setGroupId(g.id)} />
          ))}
          <Chip label="Sin grupo" active={groupId === 'none'} onPress={() => setGroupId('none')} />
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/editor/${item.id}`)}>
            {item.image_uri ? (
              <Image source={{ uri: item.image_uri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}><Text>🥖</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {groupName(item.group_id)}
                {hasPromo(item) ? `  ·  Promo ${promoLabel(item, formatPrice)}` : ''}
              </Text>
            </View>
            <Text style={styles.price}>{formatPrice(item.price_cents)}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay productos. Usa "＋ Producto" o "Varios".</Text>}
      />
    </View>
  );
}

function Btn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, primary && styles.btnPrimary]}>
      <Text style={[styles.btnText, primary && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea' },
  actions: { flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 4 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#efdcc2', alignItems: 'center' },
  btnPrimary: { flex: 1.4, backgroundColor: '#b3541e' },
  btnText: { fontWeight: '800', color: '#5a3a1a' },
  search: { margin: 10, marginTop: 6, marginBottom: 2, padding: 9, backgroundColor: '#fff', borderRadius: 10, fontSize: 15 },
  chips: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#efdcc2' },
  chipActive: { backgroundColor: '#b3541e' },
  chipText: { color: '#5a3a1a', fontWeight: '600' },
  list: { padding: 10, gap: 6, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 8 },
  thumb: { width: 46, height: 46, borderRadius: 8 },
  thumbEmpty: { backgroundColor: '#f6e7d3', alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '700', color: '#2b2118', fontSize: 15 },
  meta: { color: '#8a7a68', fontSize: 12, marginTop: 1 },
  price: { fontWeight: '800', color: '#b3541e', fontSize: 15 },
  chev: { fontSize: 22, color: '#b8a690' },
  empty: { textAlign: 'center', marginTop: 50, color: '#8a7a68' },
});
