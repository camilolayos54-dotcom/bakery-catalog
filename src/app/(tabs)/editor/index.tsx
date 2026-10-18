import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SyncModal } from '@/components/SyncModal';
import { hasPromo, promoLabel } from '@/lib/cart';
import { formatPrice } from '@/lib/money';
import { useStore } from '@/store';

export default function Editor() {
  const router = useRouter();
  const { groups, subcategories, products } = useStore();
  const [groupId, setGroupId] = useState<number | null | 'none'>(null);
  const [query, setQuery] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const groupName = (id: number | null) => groups.find((g) => g.id === id)?.name ?? 'Sin categoría';
  const subName = (id: number | null) => subcategories.find((s) => s.id === id)?.name;

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
        <Btn label="Categorías" onPress={() => router.push('/editor/groups')} />
        <Btn label="Carga masiva" onPress={() => router.push('/editor/bulk')} />
        <Btn label="🔄 Respaldo" onPress={() => setShowSyncModal(true)} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Buscar producto por nombre…"
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todos" count={products.length} active={groupId === null} onPress={() => setGroupId(null)} />
          {groups.map((g) => {
            const count = products.filter((p) => p.group_id === g.id).length;
            return (
              <Chip
                key={g.id}
                label={g.name}
                count={count}
                active={groupId === g.id}
                onPress={() => setGroupId(g.id)}
              />
            );
          })}
          <Chip
            label="Sin categoría"
            count={products.filter((p) => p.group_id === null).length}
            active={groupId === 'none'}
            onPress={() => setGroupId('none')}
          />
        </ScrollView>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {visible.length} producto{visible.length === 1 ? '' : 's'} encontrado{visible.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const sub = subName(item.subcategory_id);
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/editor/${item.id}`)}>
              {item.image_uri ? (
                <Image source={{ uri: item.image_uri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}><Text style={{ fontSize: 20 }}>🥖</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  📂 {groupName(item.group_id)}{sub ? ` › ${sub}` : ''}
                  {hasPromo(item) ? `  ·  Promo ${promoLabel(item, formatPrice)}` : ''}
                </Text>
              </View>
              <Text style={styles.price}>{formatPrice(item.price_cents)}</Text>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No hay productos en esta sección.</Text>}
      />
      <SyncModal visible={showSyncModal} onClose={() => setShowSyncModal(false)} />
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

function Chip({ label, count, active, onPress }: { label: string; count?: number; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '800' }]}>
        {label} {count !== undefined ? `(${count})` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea' },
  actions: { flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 4 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#efdcc2', alignItems: 'center' },
  btnPrimary: { flex: 1.4, backgroundColor: '#b3541e' },
  btnText: { fontWeight: '800', color: '#5a3a1a' },
  search: { margin: 10, marginTop: 6, marginBottom: 2, padding: 10, backgroundColor: '#fff', borderRadius: 10, fontSize: 15, borderWidth: 1, borderColor: '#ebd9c3' },
  chips: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#efdcc2', borderWidth: 1, borderColor: '#e4cdb0' },
  chipActive: { backgroundColor: '#b3541e', borderColor: '#8a3c0f' },
  chipText: { color: '#5a3a1a', fontWeight: '600', fontSize: 13 },
  statusBar: { paddingHorizontal: 12, paddingBottom: 4 },
  statusText: { fontSize: 12, color: '#8a7a68', fontWeight: '600' },
  list: { padding: 10, gap: 6, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#faecd9' },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  thumbEmpty: { backgroundColor: '#f6e7d3', alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '700', color: '#2b2118', fontSize: 15 },
  meta: { color: '#8a7a68', fontSize: 12, marginTop: 2 },
  price: { fontWeight: '800', color: '#b3541e', fontSize: 15 },
  chev: { fontSize: 22, color: '#b8a690' },
  empty: { textAlign: 'center', marginTop: 50, color: '#8a7a68' },
});
