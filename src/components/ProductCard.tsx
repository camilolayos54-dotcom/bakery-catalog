import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hasPromo, promoLabel } from '@/lib/cart';
import { formatPrice } from '@/lib/money';
import type { Product } from '@/types';

type Props = {
  product: Product;
  width: number;
  qty: number;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
};

export function ProductCard({ product, width, qty, onPress, onLongPress, onEdit }: Props) {
  const inCart = qty > 0;
  return (
    <View style={{ width, padding: 4 }}>
      <Pressable
        style={[styles.card, inCart && styles.selected]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
      >
        {product.image_uri ? (
          <Image source={{ uri: product.image_uri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.emoji}>🥖</Text>
          </View>
        )}
        {inCart ? (
          <View style={styles.qty}>
            <Text style={styles.qtyText}>×{qty}</Text>
          </View>
        ) : null}
        {hasPromo(product) ? (
          <View style={styles.promo}>
            <Text style={styles.promoText}>{promoLabel(product, formatPrice)}</Text>
          </View>
        ) : null}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.price}>{formatPrice(product.price_cents)}</Text>
        </View>
      </Pressable>
      <Pressable style={styles.edit} onPress={onEdit} hitSlop={6}>
        <Text style={styles.editText}>✎</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#b3541e', backgroundColor: '#fff4e8' },
  image: { width: '100%', aspectRatio: 1 },
  placeholder: { backgroundColor: '#f6e7d3', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30 },
  qty: { position: 'absolute', top: 4, right: 4, minWidth: 28, paddingHorizontal: 6, height: 24, borderRadius: 12, backgroundColor: '#b3541e', alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  promo: { position: 'absolute', bottom: 46, left: 4, backgroundColor: '#2e7d32', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  promoText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  info: { paddingHorizontal: 8, paddingVertical: 6 },
  name: { fontSize: 12, fontWeight: '600', color: '#2b2118' },
  price: { fontSize: 15, fontWeight: '800', color: '#b3541e' },
  edit: { position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  editText: { fontSize: 14, color: '#8a4b14' },
});
