import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import * as repo from '@/db/repo';
import { confirmDialog, notify } from '@/lib/dialog';
import { pickCover, removeImage } from '@/lib/images';
import { formatPrice, parsePrice } from '@/lib/money';
import { useStore } from '@/store';

export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = id === 'new' ? undefined : Number(id);
  const router = useRouter();
  const { groups, reload } = useStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [promoQty, setPromoQty] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [newGroup, setNewGroup] = useState('');

  useEffect(() => {
    if (!productId) return;
    repo.getProduct(productId).then((p) => {
      if (!p) return;
      setName(p.name);
      setPrice(String(p.price_cents / 100));
      setImage(p.image_uri);
      setOriginalImage(p.image_uri);
      setGroupId(p.group_id);
      if (p.promo_qty && p.promo_price_cents != null) {
        setPromoQty(String(p.promo_qty));
        setPromoPrice(String(p.promo_price_cents / 100));
      }
    });
  }, [productId]);

  async function createGroup() {
    if (!newGroup.trim()) return;
    const gid = await repo.addGroup(newGroup);
    await reload();
    setGroupId(gid);
    setNewGroup('');
  }

  function choosePhoto() {
    const pick = async (src: 'camera' | 'gallery') => {
      const uri = await pickCover(src);
      if (uri) {
        if (image && image !== originalImage) removeImage(image);
        setImage(uri);
      }
    };
    if (Platform.OS === 'web') return void pick('gallery');
    Alert.alert('Portada', 'Elige el origen de la foto', [
      { text: 'Cámara', onPress: () => pick('camera') },
      { text: 'Galería', onPress: () => pick('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function save() {
    const cents = parsePrice(price);
    if (!name.trim()) return notify('Falta el nombre');
    if (cents === null) return notify('Precio inválido');
    const pq = Math.floor(Number(promoQty));
    const pp = parsePrice(promoPrice);
    const wantsPromo = promoQty.trim() !== '' || promoPrice.trim() !== '';
    if (wantsPromo && !(pq >= 2 && pp !== null)) {
      return notify('Promoción incompleta', 'Indica cantidad (2 o más) y precio total, o deja ambos vacíos.');
    }
    await repo.saveProduct(
      {
        name,
        price_cents: cents,
        image_uri: image,
        group_id: groupId,
        promo_qty: wantsPromo ? pq : null,
        promo_price_cents: wantsPromo ? pp : null,
      },
      productId,
    );
    if (originalImage && originalImage !== image) removeImage(originalImage);
    await reload();
    router.back();
  }

  async function remove() {
    if (!(await confirmDialog('Eliminar producto', `¿Eliminar "${name}"?`))) return;
    await repo.deleteProduct(productId!);
    removeImage(originalImage);
    await reload();
    router.back();
  }

  const cents = parsePrice(price);
  const groupOptions: { id: number | null; name: string }[] = [{ id: null, name: 'Sin grupo' }, ...groups];

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: productId ? 'Editar producto' : 'Nuevo producto' }} />

      <Pressable onPress={choosePhoto} style={styles.cover}>
        {image ? (
          <Image source={{ uri: image }} style={styles.coverImg} contentFit="cover" />
        ) : (
          <Text style={styles.coverHint}>📷 Agregar portada</Text>
        )}
      </Pressable>

      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Pan de bono" />

      <Text style={styles.label}>Precio {cents !== null && cents > 0 ? `(${formatPrice(cents)})` : ''}</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Ej. 2500"
      />

      <Text style={styles.label}>Grupo</Text>
      <View style={styles.groupsWrap}>
        {groupOptions.map((g) => (
          <Pressable
            key={String(g.id)}
            onPress={() => setGroupId(g.id)}
            style={[styles.chip, groupId === g.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, groupId === g.id && styles.chipTextActive]}>{g.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.inline}>
        <TextInput
          style={[styles.input, { flex: 1, fontSize: 15 }]}
          value={newGroup}
          onChangeText={setNewGroup}
          placeholder="Crear grupo nuevo (ej. Pasteles)"
          onSubmitEditing={createGroup}
        />
        <Pressable style={styles.smallBtn} onPress={createGroup}>
          <Text style={styles.smallBtnText}>Crear</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Promoción (opcional)</Text>
      <Text style={styles.hint}>Ej.: 3 unidades por $5.000. Se aplica sola en la pestaña Sumas.</Text>
      <View style={styles.inline}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={promoQty}
          onChangeText={setPromoQty}
          keyboardType="number-pad"
          placeholder="Unidades"
        />
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={promoPrice}
          onChangeText={setPromoPrice}
          keyboardType="decimal-pad"
          placeholder="Precio total del combo"
        />
      </View>

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Guardar</Text>
      </Pressable>
      {productId ? (
        <Pressable onPress={remove} style={styles.delete}>
          <Text style={styles.deleteText}>Eliminar producto</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 8, backgroundColor: '#fbf4ea' },
  cover: {
    width: '55%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', alignSelf: 'center',
    backgroundColor: '#f1e0c8', alignItems: 'center', justifyContent: 'center',
  },
  inline: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: 12, color: '#8a7a68' },
  smallBtn: { backgroundColor: '#8a4b14', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  coverImg: { width: '100%', height: '100%' },
  coverHint: { fontSize: 18, color: '#8a4b14' },
  label: { marginTop: 8, fontWeight: '700', color: '#5a3a1a' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 18 },
  groupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#efdcc2' },
  chipActive: { backgroundColor: '#b3541e' },
  chipText: { color: '#5a3a1a', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  save: { marginTop: 18, backgroundColor: '#b3541e', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  delete: { padding: 14, alignItems: 'center' },
  deleteText: { color: '#c0392b', fontWeight: '600' },
});
