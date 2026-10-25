import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import * as repo from '@/db/repo';
import { confirmDialog, notify } from '@/lib/dialog';
import { pickCover, removeImage } from '@/lib/images';
import { formatPrice, isSellablePrice, parsePrice } from '@/lib/money';
import { useStore } from '@/store';

export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = id === 'new' ? undefined : Number(id);
  const router = useRouter();
  const { groups, subcategories, reload } = useStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [promoQty, setPromoQty] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  /** Closes the form. It lives outside the tabs, so closing it leaves nothing behind in any tab. */
  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  useEffect(() => {
    if (!productId) return;
    repo.getProduct(productId).then((p) => {
      if (!p) return;
      setName(p.name);
      setPrice(String(p.price_cents / 100));
      setImage(p.image_uri);
      setOriginalImage(p.image_uri);
      setGroupId(p.group_id);
      setSubcategoryId(p.subcategory_id);
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
    setSubcategoryId(null);
    setNewGroup('');
  }

  async function createSubcategory() {
    if (!groupId) {
      return notify('Selecciona primero una categoría', 'Una subcategoría pertenece a una categoría principal.');
    }
    if (!newSubcategory.trim()) return;
    const sid = await repo.addSubcategory(groupId, newSubcategory);
    await reload();
    setSubcategoryId(sid);
    setNewSubcategory('');
  }

  function choosePhoto() {
    const pick = async (src: 'camera' | 'gallery') => {
      const uri = await pickCover(src);
      if (uri) {
        if (image && image !== originalImage) removeImage(image);
        setImage(uri);
      }
    };

    if (Platform.OS === 'web') {
      return void pick('gallery');
    }

    Alert.alert('Foto del producto', 'Selecciona el origen de la foto:', [
      { text: '📷 Tomar foto con cámara', onPress: () => pick('camera') },
      { text: '🖼️ Elegir de galería', onPress: () => pick('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function clearPhoto() {
    setImage(null);
  }

  async function save() {
    const cents = parsePrice(price);
    if (!name.trim()) return notify('Falta el nombre');
    if (!isSellablePrice(cents)) {
      return notify('Precio inválido', 'Ingresa un precio mayor a cero (ej. 2500 o 2.500).');
    }
    const pq = Math.floor(Number(promoQty));
    const pp = parsePrice(promoPrice);
    const wantsPromo = promoQty.trim() !== '' || promoPrice.trim() !== '';
    if (wantsPromo && !(pq >= 2 && pq <= 1000 && isSellablePrice(pp))) {
      return notify(
        'Promoción incompleta',
        'Indica cantidad (de 2 en adelante) y un precio total mayor a cero, o deja ambos vacíos.',
      );
    }
    // A subcategory only makes sense inside its own category.
    const validSub = subcategories.some((s) => s.id === subcategoryId && s.group_id === groupId);
    await repo.saveProduct(
      {
        name,
        price_cents: cents,
        image_uri: image,
        group_id: groupId,
        subcategory_id: validSub ? subcategoryId : null,
        promo_qty: wantsPromo ? pq : null,
        promo_price_cents: wantsPromo ? pp : null,
      },
      productId,
    );
    if (originalImage && originalImage !== image) removeImage(originalImage);
    await reload();
    leave();
  }

  async function remove() {
    if (!(await confirmDialog('Eliminar producto', `¿Eliminar "${name}"?`))) return;
    await repo.deleteProduct(productId!);
    removeImage(originalImage);
    await reload();
    leave();
  }

  const cents = parsePrice(price);
  const groupOptions: { id: number | null; name: string }[] = [{ id: null, name: 'Sin categoría' }, ...groups];
  const currentGroupName = groups.find((g) => g.id === groupId)?.name ?? 'Sin categoría';

  // Subcategorías disponibles para la categoría seleccionada
  const availableSubcategories = groupId ? subcategories.filter((s) => s.group_id === groupId) : [];
  const currentSubcategoryName = subcategories.find((s) => s.id === subcategoryId)?.name ?? 'Sin subcategoría';

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: productId ? 'Editar producto' : 'Nuevo producto',
        }}
      />

      <Pressable onPress={choosePhoto} style={styles.cover}>
        {image ? (
          <Image source={{ uri: image }} style={styles.coverImg} contentFit="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverHintIcon}>📷</Text>
            <Text style={styles.coverHintText}>Agregar foto</Text>
            <Text style={styles.coverHintSub}>Cámara o Galería</Text>
          </View>
        )}
      </Pressable>

      {image ? (
        <View style={styles.photoActions}>
          <Pressable style={styles.photoBtn} onPress={choosePhoto}>
            <Text style={styles.photoBtnText}>📷 Cambiar foto</Text>
          </Pressable>
          <Pressable style={[styles.photoBtn, styles.photoBtnDanger]} onPress={clearPhoto}>
            <Text style={[styles.photoBtnText, styles.photoBtnDangerText]}>🗑️ Quitar foto</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.label}>Nombre del producto</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Pan de bono" />

      <Text style={styles.label}>Precio {cents !== null && cents > 0 ? `(${formatPrice(cents)})` : ''}</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Ej. 2500 o 2.500"
      />

      {/* Selector de Categoría Principal */}
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>
          Categoría principal: <Text style={{ color: '#b3541e' }}>{currentGroupName}</Text>
        </Text>
        <Text style={styles.hint}>Toca una categoría para clasificar el producto:</Text>
      </View>

      <View style={styles.groupsWrap}>
        {groupOptions.map((g) => {
          const isSelected = groupId === g.id;
          return (
            <Pressable
              key={String(g.id)}
              onPress={() => {
                setGroupId(g.id);
                setSubcategoryId(null);
              }}
              style={[styles.chip, isSelected && styles.chipActive]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {isSelected ? '✓ ' : ''}{g.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inline}>
        <TextInput
          style={[styles.input, { flex: 1, fontSize: 14 }]}
          value={newGroup}
          onChangeText={setNewGroup}
          placeholder="Crear nueva categoría (ej. Pasteles)"
          onSubmitEditing={createGroup}
        />
        <Pressable style={styles.smallBtn} onPress={createGroup}>
          <Text style={styles.smallBtnText}>Crear</Text>
        </Pressable>
      </View>

      {/* Selector y Creador de Subcategoría */}
      {groupId ? (
        <View style={styles.subcategorySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>
              Subcategoría / Presentación: <Text style={{ color: '#8a4b14' }}>{currentSubcategoryName}</Text>
            </Text>
            <Text style={styles.hint}>Agrupa diferentes presentaciones (ej. Postobón, 400ml, Litro, etc.):</Text>
          </View>

          <View style={styles.groupsWrap}>
            <Pressable
              onPress={() => setSubcategoryId(null)}
              style={[styles.chipSub, subcategoryId === null && styles.chipSubActive]}
            >
              <Text style={[styles.chipSubText, subcategoryId === null && styles.chipSubTextActive]}>
                {subcategoryId === null ? '✓ ' : ''}Sin subcategoría
              </Text>
            </Pressable>
            {availableSubcategories.map((s) => {
              const isSelected = subcategoryId === s.id;
              return (
                <Pressable
                  key={String(s.id)}
                  onPress={() => setSubcategoryId(s.id)}
                  style={[styles.chipSub, isSelected && styles.chipSubActive]}
                >
                  <Text style={[styles.chipSubText, isSelected && styles.chipSubTextActive]}>
                    {isSelected ? '✓ ' : ''}{s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inline}>
            <TextInput
              style={[styles.input, { flex: 1, fontSize: 14 }]}
              value={newSubcategory}
              onChangeText={setNewSubcategory}
              placeholder="Nueva subcategoría (ej. Litro, Personal, Croissants...)"
              onSubmitEditing={createSubcategory}
            />
            <Pressable style={styles.smallBtnSub} onPress={createSubcategory}>
              <Text style={styles.smallBtnText}>＋ Subcategoría</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Promoción o Combo (opcional)</Text>
      <Text style={styles.hint}>Ejemplo: 3 unidades por $5.000 (se aplica automáticamente al sumar).</Text>
      <View style={styles.inline}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={promoQty}
          onChangeText={setPromoQty}
          keyboardType="number-pad"
          placeholder="Cantidad (ej. 3)"
        />
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={promoPrice}
          onChangeText={setPromoPrice}
          keyboardType="decimal-pad"
          placeholder="Precio combo (ej. 5000)"
        />
      </View>

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Guardar producto</Text>
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
  root: { padding: 16, gap: 8, backgroundColor: '#fbf4ea', paddingBottom: 40 },
  cover: {
    width: '55%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#f1e0c8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e6d3bd',
  },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverHintIcon: { fontSize: 32, marginBottom: 4 },
  coverHintText: { fontSize: 16, fontWeight: '700', color: '#8a4b14' },
  coverHintSub: { fontSize: 12, color: '#aa8c70', marginTop: 2 },
  coverImg: { width: '100%', height: '100%' },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  photoBtn: {
    backgroundColor: '#eeddcb',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6e3c12',
  },
  photoBtnDanger: {
    backgroundColor: '#fde8e8',
  },
  photoBtnDangerText: {
    color: '#c0392b',
  },
  inline: { flexDirection: 'row', gap: 8 },
  sectionHeader: { marginTop: 8 },
  hint: { fontSize: 12, color: '#8a7a68' },
  smallBtn: { backgroundColor: '#8a4b14', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  smallBtnSub: { backgroundColor: '#6e3c12', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  label: { marginTop: 6, fontWeight: '700', color: '#5a3a1a' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ebd9c3' },
  groupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#efdcc2', borderWidth: 1, borderColor: '#e4cdb0' },
  chipActive: { backgroundColor: '#b3541e', borderColor: '#8a3c0f' },
  chipText: { color: '#5a3a1a', fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '800' },

  subcategorySection: {
    backgroundColor: '#f4e8d8',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e8d4be',
  },
  chipSub: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dec9b0' },
  chipSubActive: { backgroundColor: '#6e3c12', borderColor: '#4a2507' },
  chipSubText: { color: '#6e3c12', fontWeight: '600', fontSize: 12 },
  chipSubTextActive: { color: '#fff', fontWeight: '800' },

  save: { marginTop: 18, backgroundColor: '#b3541e', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  delete: { padding: 14, alignItems: 'center' },
  deleteText: { color: '#c0392b', fontWeight: '600' },
});
