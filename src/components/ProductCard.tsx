import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/lib/money';
import type { Product } from '@/types';

export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {product.image_uri ? (
        <Image source={{ uri: product.image_uri }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.emoji}>🥖</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{formatPrice(product.price_cents)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2 },
  image: { width: '100%', aspectRatio: 1 },
  placeholder: { backgroundColor: '#f6e7d3', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 44 },
  info: { padding: 10, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#2b2118' },
  price: { fontSize: 20, fontWeight: '800', color: '#b3541e' },
});
