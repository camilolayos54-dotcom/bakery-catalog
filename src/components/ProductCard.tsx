import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hasPromo, promoLabel } from '@/lib/cart';
import { formatPrice } from '@/lib/money';
import type { Product } from '@/types';

type Props = {
  product: Product;
  width: number;
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onEdit: () => void;
};

export function ProductCard({
  product,
  width,
  qty,
  onIncrement,
  onDecrement,
  onEdit,
}: Props) {
  const inCart = qty > 0;

  return (
    <View style={{ width, padding: 5 }}>
      <Pressable
        style={[styles.card, inCart && styles.selected]}
        onPress={onIncrement}
        onLongPress={onEdit}
        delayLongPress={1800}
      >
        <View style={styles.imageContainer}>
          {product.image_uri ? (
            <Image source={{ uri: product.image_uri }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.emoji}>🥖</Text>
            </View>
          )}

          {inCart ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>×{qty}</Text>
            </View>
          ) : null}

          {hasPromo(product) ? (
            <View style={styles.promo}>
              <Text style={styles.promoText}>{promoLabel(product, formatPrice)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.price}>{formatPrice(product.price_cents)}</Text>

          {/* Stepper buttons (+ y -) */}
          <View style={styles.actionRow}>
            {inCart ? (
              <View style={styles.stepperWrap}>
                <Pressable
                  style={styles.stepBtnMinus}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDecrement();
                  }}
                  hitSlop={6}
                >
                  <Text style={styles.stepBtnTextMinus}>−</Text>
                </Pressable>
                <Text style={styles.stepperQty}>{qty}</Text>
                <Pressable
                  style={styles.stepBtnPlus}
                  onPress={(e) => {
                    e.stopPropagation();
                    onIncrement();
                  }}
                  hitSlop={6}
                >
                  <Text style={styles.stepBtnTextPlus}>＋</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.addBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  onIncrement();
                }}
              >
                <Text style={styles.addBtnText}>＋ Agregar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#faeedf',
    elevation: 2,
    shadowColor: '#5a3a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  selected: {
    borderColor: '#b3541e',
    backgroundColor: '#fff9f2',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#f6e7d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 34,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 26,
    paddingHorizontal: 7,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#b3541e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  promo: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#2e7d32',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  info: {
    padding: 9,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2b2118',
    minHeight: 34,
    lineHeight: 17,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#b3541e',
    marginTop: 2,
    marginBottom: 6,
  },
  actionRow: {
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#f2dfca',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#6e3c12',
    fontWeight: '800',
    fontSize: 12,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faecd9',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtnMinus: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2cfb7',
  },
  stepBtnTextMinus: {
    fontSize: 16,
    fontWeight: '900',
    color: '#c0392b',
    marginTop: -2,
  },
  stepperQty: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4a2c0c',
    minWidth: 20,
    textAlign: 'center',
  },
  stepBtnPlus: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#b3541e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnTextPlus: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginTop: -2,
  },
});
