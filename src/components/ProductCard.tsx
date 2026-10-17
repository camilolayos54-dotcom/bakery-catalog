import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/lib/money';
import type { Product } from '@/types';

type Props = {
  product: Product;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export function ProductCard({ product, selected, onPress, onLongPress }: Props) {
  return (
    <Pressable
      style={[styles.card, selected && styles.selected]}
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
      {selected ? (
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      ) : null}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{formatPrice(product.price_cents)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2, borderWidth: 3, borderColor: 'transparent' },
  selected: { borderColor: '#b3541e' },
  image: { width: '100%', aspectRatio: 1 },
  placeholder: { backgroundColor: '#f6e7d3', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 44 },
  check: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#b3541e', alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontWeight: '800' },
  info: { padding: 10, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#2b2118' },
  price: { fontSize: 20, fontWeight: '800', color: '#b3541e' },
});
