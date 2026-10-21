import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import * as repo from '@/db/repo';
import { notify } from '@/lib/dialog';
import { formatPrice, isSellablePrice, parsePrice } from '@/lib/money';
import { useStore } from '@/store';

/** Parses "Pan de bono 2500", "Croissant, 4.000" or "Torta - $15000" (price = last token). */
function parseLine(line: string): { name: string; price_cents: number } | null {
  const m = line.trim().match(/^(.*?)[\s,;:\-–=]+\$?\s*([\d][\d.,]*)\s*$/);
  if (!m || !m[1].trim()) return null;
  const price = parsePrice(m[2]);
  return isSellablePrice(price) ? { name: m[1].trim(), price_cents: price } : null;
}

export default function Bulk() {
  const router = useRouter();
  const { groups, reload } = useStore();
  const [text, setText] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);

  const { valid, invalid } = useMemo(() => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const valid: { name: string; price_cents: number }[] = [];
    const invalid: string[] = [];
    for (const l of lines) {
      const p = parseLine(l);
      if (p) valid.push(p);
      else invalid.push(l);
    }
    return { valid, invalid };
  }, [text]);

  async function save() {
    if (valid.length === 0) return notify('Escribe al menos un producto', 'Formato: nombre y precio, uno por línea.');
    await repo.addProductsBulk(valid, groupId);
    await reload();
    router.back();
  }

  const options: { id: number | null; name: string }[] = [{ id: null, name: 'Sin grupo' }, ...groups];

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Text style={styles.help}>
        Escribe un producto por línea con su precio al final. Ejemplo:{'\n'}
        Pan de bono 2500{'\n'}Croissant, 4000{'\n'}Torta de chocolate - 15000
      </Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        placeholder={'Pan de bono 2500\nCroissant 4000'}
      />

      <Text style={styles.label}>Grupo para todos</Text>
      <View style={styles.wrap}>
        {options.map((g) => (
          <Pressable key={String(g.id)} onPress={() => setGroupId(g.id)} style={[styles.chip, groupId === g.id && styles.chipActive]}>
            <Text style={[styles.chipText, groupId === g.id && styles.chipTextActive]}>{g.name}</Text>
          </Pressable>
        ))}
      </View>

      {valid.length > 0 ? (
        <View style={styles.preview}>
          <Text style={styles.label}>Se agregarán {valid.length}:</Text>
          {valid.slice(0, 12).map((p, i) => (
            <Text key={i} style={styles.previewLine}>• {p.name} — {formatPrice(p.price_cents)}</Text>
          ))}
          {valid.length > 12 ? <Text style={styles.previewLine}>… y {valid.length - 12} más</Text> : null}
        </View>
      ) : null}
      {invalid.length > 0 ? (
        <Text style={styles.warn}>Sin precio válido (se ignorarán): {invalid.join(' | ')}</Text>
      ) : null}

      <Pressable style={[styles.save, valid.length === 0 && { opacity: 0.5 }]} onPress={save}>
        <Text style={styles.saveText}>Agregar {valid.length || ''} producto(s)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 10, backgroundColor: '#fbf4ea' },
  help: { color: '#5a3a1a', lineHeight: 20 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 12, minHeight: 160, fontSize: 16 },
  label: { fontWeight: '700', color: '#5a3a1a' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#efdcc2' },
  chipActive: { backgroundColor: '#b3541e' },
  chipText: { color: '#5a3a1a', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  preview: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 2 },
  previewLine: { color: '#2b2118' },
  warn: { color: '#c0392b', fontSize: 12 },
  save: { marginTop: 10, backgroundColor: '#b3541e', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
