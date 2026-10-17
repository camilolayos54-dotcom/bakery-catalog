import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { applyOp, applyPriceOp, type PriceOp } from '@/db/repo';
import { notify } from '@/lib/dialog';
import { formatPrice } from '@/lib/money';
import { useStore } from '@/store';

const OPS: { op: PriceOp; label: string; name: string }[] = [
  { op: 'add', label: '+', name: 'Sumar' },
  { op: 'sub', label: '−', name: 'Restar' },
  { op: 'mul', label: '×', name: 'Multiplicar' },
  { op: 'div', label: '÷', name: 'Dividir' },
];

type Props = { visible: boolean; ids: number[]; onClose: (changed: boolean) => void };

export function OperationModal({ visible, ids, onClose }: Props) {
  const products = useStore((s) => s.products);
  const reload = useStore((s) => s.reload);
  const [op, setOp] = useState<PriceOp>('add');
  const [text, setText] = useState('');
  const [percent, setPercent] = useState(false);

  const value = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(value) && value >= 0 && !(op === 'div' && value === 0);
  const canPercent = op === 'add' || op === 'sub';
  const usePercent = percent && canPercent;
  const selected = products.filter((p) => ids.includes(p.id));
  const sample = selected[0];

  async function apply() {
    if (!valid) return notify('Escribe un valor válido');
    await applyPriceOp(ids, op, value, usePercent);
    await reload();
    setText('');
    onClose(true);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Operar precios de {ids.length} producto(s)</Text>

          <View style={styles.opsRow}>
            {OPS.map((o) => (
              <Pressable key={o.op} onPress={() => setOp(o.op)} style={[styles.opBtn, op === o.op && styles.opActive]}>
                <Text style={[styles.opLabel, op === o.op && styles.opLabelActive]}>{o.label}</Text>
                <Text style={[styles.opName, op === o.op && styles.opLabelActive]}>{o.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.valueRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              placeholder={op === 'mul' || op === 'div' ? 'Factor, ej. 2' : usePercent ? 'Porcentaje, ej. 10' : 'Valor, ej. 500'}
              autoFocus
            />
            {canPercent ? (
              <Pressable onPress={() => setPercent(!percent)} style={[styles.pct, usePercent && styles.opActive]}>
                <Text style={[styles.opLabel, usePercent && styles.opLabelActive]}>%</Text>
              </Pressable>
            ) : null}
          </View>

          {sample && valid ? (
            <Text style={styles.preview}>
              Ej.: {sample.name} {formatPrice(sample.price_cents)} → {formatPrice(applyOp(sample.price_cents, op, value, usePercent))}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={() => onClose(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.apply, !valid && { opacity: 0.4 }]} onPress={apply}>
              <Text style={styles.applyText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fbf4ea', padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#2b2118' },
  opsRow: { flexDirection: 'row', gap: 8 },
  opBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#efdcc2' },
  opActive: { backgroundColor: '#b3541e' },
  opLabel: { fontSize: 24, fontWeight: '800', color: '#5a3a1a' },
  opName: { fontSize: 11, color: '#5a3a1a' },
  opLabelActive: { color: '#fff' },
  valueRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 20 },
  pct: { width: 56, borderRadius: 10, backgroundColor: '#efdcc2', alignItems: 'center', justifyContent: 'center' },
  preview: { color: '#5a3a1a' },
  actions: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, padding: 14, alignItems: 'center' },
  cancelText: { color: '#8a4b14', fontWeight: '700' },
  apply: { flex: 2, backgroundColor: '#b3541e', padding: 14, borderRadius: 12, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
