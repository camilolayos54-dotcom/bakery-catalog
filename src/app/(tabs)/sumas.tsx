import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { hasPromo, lineSavings, lineTotal, promoLabel } from '@/lib/cart';
import { formatPrice, parsePrice } from '@/lib/money';
import { useStore } from '@/store';

export default function Sumas() {
  const { products, cart, addToCart, setQty, clearCart } = useStore();
  const [discount, setDiscount] = useState('');
  const [discountPct, setDiscountPct] = useState(true);
  const [extra, setExtra] = useState('');
  const [people, setPeople] = useState('');
  const [received, setReceived] = useState('');

  const lines = useMemo(
    () =>
      products
        .filter((p) => (cart[p.id] ?? 0) > 0)
        .map((p) => ({ p, qty: cart[p.id], total: lineTotal(p, cart[p.id]), saved: lineSavings(p, cart[p.id]) })),
    [products, cart],
  );

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const promoSaved = lines.reduce((s, l) => s + l.saved, 0);
  const units = lines.reduce((s, l) => s + l.qty, 0);

  const discNum = Number(discount.replace(',', '.'));
  const discountCents = !discount.trim() || !Number.isFinite(discNum) || discNum < 0
    ? 0
    : discountPct
      ? Math.round(subtotal * Math.min(discNum, 100) / 100)
      : Math.min(subtotal, parsePrice(discount) ?? 0);
  const extraCents = parsePrice(extra) ?? 0;
  const total = Math.max(0, subtotal - discountCents + extraCents);

  const n = Math.floor(Number(people));
  const perPerson = n >= 2 ? Math.round(total / n) : null;
  const receivedCents = parsePrice(received);
  const change = receivedCents != null ? receivedCents - total : null;

  if (lines.length === 0) {
    return (
      <View style={[styles.root, styles.emptyBox]}>
        <Text style={styles.emptyEmoji}>🧮</Text>
        <Text style={styles.empty}>
          Aún no hay nada sumado.{'\n'}En Productos, mantén pulsado un producto para añadirlo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {lines.map(({ p, qty, total: lt, saved }) => (
        <View key={p.id} style={styles.line}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
            <Text style={styles.unit}>
              {formatPrice(p.price_cents)} c/u{hasPromo(p) ? `  ·  Promo ${promoLabel(p, formatPrice)}` : ''}
            </Text>
            {saved > 0 ? <Text style={styles.saved}>Ahorras {formatPrice(saved)}</Text> : null}
          </View>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setQty(p.id, qty - 1)}><Text style={styles.stepText}>−</Text></Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable style={styles.stepBtn} onPress={() => addToCart(p.id)}><Text style={styles.stepText}>+</Text></Pressable>
          </View>
          <Text style={styles.lineTotal}>{formatPrice(lt)}</Text>
        </View>
      ))}

      <View style={styles.card}>
        <Row label={`Subtotal (${units} unid.)`} value={formatPrice(subtotal)} />
        {promoSaved > 0 ? <Row label="Promociones aplicadas" value={`− ${formatPrice(promoSaved)}`} green /> : null}

        <Text style={styles.sectionLabel}>Descuento</Text>
        <View style={styles.inline}>
          <TextInput style={styles.input} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder={discountPct ? 'Ej. 10' : 'Ej. 500'} />
          <Pressable style={[styles.toggle, discountPct && styles.toggleOn]} onPress={() => setDiscountPct(true)}><Text style={[styles.toggleText, discountPct && styles.toggleTextOn]}>%</Text></Pressable>
          <Pressable style={[styles.toggle, !discountPct && styles.toggleOn]} onPress={() => setDiscountPct(false)}><Text style={[styles.toggleText, !discountPct && styles.toggleTextOn]}>$</Text></Pressable>
        </View>
        {discountCents > 0 ? <Row label="Descuento" value={`− ${formatPrice(discountCents)}`} green /> : null}

        <Text style={styles.sectionLabel}>Extra (domicilio, empaque…)</Text>
        <TextInput style={styles.input} value={extra} onChangeText={setExtra} keyboardType="decimal-pad" placeholder="Ej. 2000" />
        {extraCents > 0 ? <Row label="Extra" value={`+ ${formatPrice(extraCents)}`} /> : null}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>

        <Text style={styles.sectionLabel}>Dividir entre (personas)</Text>
        <TextInput style={styles.input} value={people} onChangeText={setPeople} keyboardType="number-pad" placeholder="Ej. 3" />
        {perPerson != null ? <Row label="Cada uno paga" value={formatPrice(perPerson)} bold /> : null}

        <Text style={styles.sectionLabel}>Recibido (para el vuelto)</Text>
        <TextInput style={styles.input} value={received} onChangeText={setReceived} keyboardType="decimal-pad" placeholder="Ej. 50000" />
        {change != null ? (
          <Row label={change >= 0 ? 'Vuelto' : 'Falta'} value={formatPrice(Math.abs(change))} bold green={change >= 0} />
        ) : null}
      </View>

      <Pressable
        style={styles.clear}
        onPress={() => {
          clearCart();
          setDiscount(''); setExtra(''); setPeople(''); setReceived('');
        }}
      >
        <Text style={styles.clearText}>Nueva cuenta (vaciar)</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, green, bold }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowValue, green && { color: '#2e7d32' }, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea' },
  content: { padding: 12, gap: 8, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#8a7a68', fontSize: 15, lineHeight: 22 },
  line: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 10, gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#2b2118' },
  unit: { fontSize: 11, color: '#8a7a68', marginTop: 1 },
  saved: { fontSize: 11, color: '#2e7d32', fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#efdcc2', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontWeight: '800', color: '#5a3a1a', marginTop: -2 },
  qty: { minWidth: 22, textAlign: 'center', fontWeight: '800', fontSize: 15 },
  lineTotal: { minWidth: 64, textAlign: 'right', fontWeight: '800', color: '#b3541e' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 6, marginTop: 4 },
  sectionLabel: { marginTop: 8, fontWeight: '700', color: '#5a3a1a', fontSize: 13 },
  inline: { flexDirection: 'row', gap: 6 },
  input: { flex: 1, backgroundColor: '#fbf4ea', borderRadius: 10, padding: 10, fontSize: 16 },
  toggle: { width: 44, borderRadius: 10, backgroundColor: '#efdcc2', alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: '#b3541e' },
  toggleText: { fontWeight: '800', color: '#5a3a1a', fontSize: 16 },
  toggleTextOn: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#5a3a1a' },
  rowValue: { color: '#2b2118', fontWeight: '600' },
  totalBox: { marginTop: 10, backgroundColor: '#2b2118', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#efdcc2', fontWeight: '700', fontSize: 14 },
  totalValue: { color: '#fff', fontWeight: '900', fontSize: 28 },
  clear: { padding: 14, alignItems: 'center' },
  clearText: { color: '#c0392b', fontWeight: '700' },
});
