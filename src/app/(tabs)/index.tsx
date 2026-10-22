import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { SyncModal } from '@/components/SyncModal';
import * as repo from '@/db/repo';
import { hasPromo } from '@/lib/cart';
import { notify } from '@/lib/dialog';
import { pickCover } from '@/lib/images';
import { formatPrice, isSellablePrice, parsePrice } from '@/lib/money';
import { moveBy, moveToIndex } from '@/lib/order';
import { useStore } from '@/store';

const PAD = 8;

export default function Catalog() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // 2 columnas cómodas en móviles (ancho ~360-430px), escalando en pantallas más anchas
  const columns = Math.max(2, Math.floor(width / 165));
  const cardWidth = (width - PAD * 2) / columns;

  const {
    groups,
    subcategories,
    products,
    loaded,
    loadError,
    cart,
    frequentIds,
    addToCart,
    removeFromCart,
    reload,
  } = useStore();

  const [groupId, setGroupId] = useState<number | null | 'frecuentes' | 'promociones'>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  // Estado del Modal de Añadir Rápido
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickImage, setQuickImage] = useState<string | null>(null);
  const [quickGroupId, setQuickGroupId] = useState<number | null>(null);
  const [quickSubcategoryId, setQuickSubcategoryId] = useState<number | null>(null);

  // Modo mover: se activa manteniendo presionado 2 seg un producto
  const [movingId, setMovingId] = useState<number | null>(null);
  const [showMoveCategory, setShowMoveCategory] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);
  const [targetSubId, setTargetSubId] = useState<number | null>(null);

  // Cantidad de productos con promociones
  const promoCount = useMemo(() => products.filter((p) => hasPromo(p)).length, [products]);
  // Solo cuentan los frecuentes que todavía existen en el catálogo
  const frequentCount = useMemo(() => {
    const ids = new Set(products.map((p) => p.id));
    return frequentIds.filter((id) => ids.has(id)).length;
  }, [products, frequentIds]);

  // Subcategorías de la categoría seleccionada en catálogo
  const activeSubcategories = useMemo(() => {
    if (groupId === null || groupId === 'frecuentes' || groupId === 'promociones') return [];
    return subcategories.filter((s) => s.group_id === groupId);
  }, [subcategories, groupId]);

  // Subcategorías disponibles en el modal rápido
  const quickAvailableSubs = useMemo(() => {
    if (quickGroupId === null) return [];
    return subcategories.filter((s) => s.group_id === quickGroupId);
  }, [subcategories, quickGroupId]);

  function handleSelectGroup(id: number | null | 'frecuentes' | 'promociones') {
    setGroupId(id);
    setSubcategoryId(null); // reiniciar subcategoría al cambiar grupo
    setMovingId(null);
  }

  function handleSelectSubcategory(id: number | null) {
    setSubcategoryId(id);
    setMovingId(null);
  }

  // Abre el modal rellenando automáticamente la categoría y subcategoría activas
  function openQuickAdd() {
    setQuickName('');
    setQuickPrice('');
    setQuickImage(null);
    const targetGroupId = typeof groupId === 'number' ? groupId : (groups[0]?.id ?? null);
    setQuickGroupId(targetGroupId);
    setQuickSubcategoryId(subcategoryId !== null ? subcategoryId : null);
    setShowQuickModal(true);
  }

  function handleQuickPhoto() {
    const pick = async (src: 'camera' | 'gallery') => {
      const uri = await pickCover(src);
      if (uri) setQuickImage(uri);
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

  async function handleSaveQuick() {
    const cents = parsePrice(quickPrice);
    if (!quickName.trim()) {
      return notify('Falta el nombre', 'Ingresa el nombre del producto.');
    }
    if (!isSellablePrice(cents)) {
      return notify('Precio inválido', 'Ingresa un precio mayor a cero (ej. 2500 o 2.500).');
    }

    await repo.saveProduct({
      name: quickName.trim(),
      price_cents: cents,
      image_uri: quickImage,
      group_id: quickGroupId,
      subcategory_id: quickSubcategoryId,
      promo_qty: null,
      promo_price_cents: null,
    });

    await reload();
    setShowQuickModal(false);
    notify('Producto añadido', `"${quickName.trim()}" ya está en el catálogo.`);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Filtro especial: Productos frecuentes (ordenados de mayor a menor frecuencia)
    if (groupId === 'frecuentes') {
      const orderMap = new Map(frequentIds.map((id, index) => [id, index]));
      return products
        .filter((p) => orderMap.has(p.id) && (!q || p.name.toLowerCase().includes(q)))
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    }

    // Filtro especial: Promociones activas en todo el catálogo
    if (groupId === 'promociones') {
      return products.filter((p) => hasPromo(p) && (!q || p.name.toLowerCase().includes(q)));
    }

    return products.filter((p) => {
      const matchGroup = groupId === null || p.group_id === groupId;
      const matchSub = subcategoryId === null || p.subcategory_id === subcategoryId;
      const matchQuery = !q || p.name.toLowerCase().includes(q);
      return matchGroup && matchSub && matchQuery;
    });
  }, [products, groupId, subcategoryId, query, frequentIds]);

  // ---- Mover productos -------------------------------------------------------
  // Frecuentes y Promociones tienen su propio orden: solo se reordena en "Todos" o dentro de una categoría.
  const canReorder = groupId !== 'frecuentes' && groupId !== 'promociones';
  const movingProduct = movingId != null ? (products.find((p) => p.id === movingId) ?? null) : null;
  const moveMode = movingProduct !== null && canReorder;
  const visibleIds = useMemo(() => visible.map((p) => p.id), [visible]);

  function startMove(id: number) {
    if (!canReorder) {
      return notify(
        'Mover productos',
        'Para cambiar el orden entra a "Todos" o a una categoría. Frecuentes y Promociones se ordenan solas.',
      );
    }
    setMovingId(id);
  }

  async function applyOrder(ids: number[]) {
    await repo.reorderProducts(ids);
    await reload();
  }

  function moveStep(delta: -1 | 1) {
    if (movingId != null) void applyOrder(moveBy(visibleIds, movingId, delta));
  }

  function moveEdge(edge: 'start' | 'end') {
    if (movingId != null) void applyOrder(moveToIndex(visibleIds, movingId, edge === 'start' ? 0 : visibleIds.length - 1));
  }

  /** Tocar otra tarjeta: el producto queda exactamente en esa posición. */
  function dropOn(targetId: number) {
    if (movingId == null || targetId === movingId) return;
    const idx = visibleIds.indexOf(targetId);
    if (idx >= 0) void applyOrder(moveToIndex(visibleIds, movingId, idx));
  }

  function openMoveCategory() {
    if (!movingProduct) return;
    setTargetGroupId(movingProduct.group_id);
    setTargetSubId(movingProduct.subcategory_id);
    setShowMoveCategory(true);
  }

  async function confirmMoveCategory() {
    if (!movingProduct) return;
    await repo.moveProductGroup(movingProduct.id, targetGroupId, targetSubId);
    await reload();
    const gName = groups.find((g) => g.id === targetGroupId)?.name ?? 'Sin categoría';
    const sName = subcategories.find((s) => s.id === targetSubId)?.name;
    setShowMoveCategory(false);
    setMovingId(null);
    notify('Producto movido', `"${movingProduct.name}" ahora está en ${gName}${sName ? ` › ${sName}` : ''}.`);
  }

  const movingIndex = movingId != null ? visibleIds.indexOf(movingId) : -1;
  const targetSubs = targetGroupId !== null ? subcategories.filter((s) => s.group_id === targetGroupId) : [];

  const activeGroupObj = groups.find((g) => g.id === quickGroupId);
  const activeSubObj = subcategories.find((s) => s.id === quickSubcategoryId);
  const quickCents = parsePrice(quickPrice);

  return (
    <View style={styles.root}>
      {/* Barra superior: Búsqueda y Botón de Respaldo/Sincronización */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Buscar producto…"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
        <Pressable
          style={styles.syncHeaderBtn}
          onPress={() => setShowSyncModal(true)}
          accessibilityLabel="Sincronizar y respaldar datos"
        >
          <Text style={styles.syncHeaderBtnText}>🔄 Respaldo</Text>
        </Pressable>
      </View>

      {/* Fila 1: Filtro de Categorías principales, Frecuentes y Promociones */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Todos" active={groupId === null} onPress={() => handleSelectGroup(null)} />
          <Chip
            label={`⭐ Frecuentes${frequentCount > 0 ? ` (${frequentCount})` : ''}`}
            active={groupId === 'frecuentes'}
            onPress={() => handleSelectGroup('frecuentes')}
          />
          <Chip
            label={`🏷️ Promociones${promoCount > 0 ? ` (${promoCount})` : ''}`}
            active={groupId === 'promociones'}
            onPress={() => handleSelectGroup('promociones')}
          />
          {groups.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              active={groupId === g.id}
              onPress={() => handleSelectGroup(g.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Fila 2: Filtro de Subcategorías (si la categoría seleccionada tiene) */}
      {activeSubcategories.length > 0 ? (
        <View style={styles.subChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subChips}>
            <SubChip
              label="Todas las presentaciones"
              active={subcategoryId === null}
              onPress={() => handleSelectSubcategory(null)}
            />
            {activeSubcategories.map((s) => (
              <SubChip
                key={s.id}
                label={s.name}
                active={subcategoryId === s.id}
                onPress={() => handleSelectSubcategory(s.id)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Indicador de ayuda */}
      <View style={styles.hintWrap}>
        {moveMode ? (
          <Text style={[styles.hintText, styles.hintMoving]}>
            Moviendo <Text style={styles.hintBold}>{movingProduct?.name}</Text> · toca otra tarjeta para ponerlo ahí o usa los botones de abajo
          </Text>
        ) : (
          <Text style={styles.hintText}>
            Toca <Text style={styles.hintBold}>＋</Text> o <Text style={styles.hintBold}>−</Text> para sumar o restar · <Text style={styles.hintBold}>✎</Text> para editar · Mantén <Text style={styles.hintBold}>2 seg</Text> para mover
          </Text>
        )}
      </View>

      {/* Cuadrícula de productos */}
      <FlatList
        data={visible}
        key={columns}
        keyExtractor={(p) => String(p.id)}
        numColumns={columns}
        extraData={[cart, movingId, moveMode]}
        contentContainerStyle={[styles.grid, moveMode && { paddingBottom: 190 }]}
        renderItem={({ item }) => {
          const qty = cart[item.id] ?? 0;
          return (
            <ProductCard
              product={item}
              width={cardWidth}
              qty={qty}
              moving={moveMode && item.id === movingId}
              moveMode={moveMode}
              onIncrement={() => (moveMode ? dropOn(item.id) : addToCart(item.id))}
              onDecrement={() => removeFromCart(item.id)}
              onEdit={() => router.push(`/editor/${item.id}`)}
              onStartMove={() => startMove(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loadError && !loaded ? (
              <>
                <Text style={styles.empty}>No se pudo cargar el catálogo.{'\n'}{loadError}</Text>
                <Pressable style={styles.retryBtn} onPress={() => void reload().catch(() => undefined)}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </Pressable>
              </>
            ) : null}
            <Text style={styles.empty}>
              {loadError && !loaded ? '' : loaded
                ? groupId === 'frecuentes'
                  ? 'Aún no hay productos frecuentes.\nSe guardan automáticamente cada vez que toques "Finalizar cuenta" en la pestaña Sumas.'
                  : groupId === 'promociones'
                    ? 'No hay productos con promociones registradas.'
                    : 'No hay productos en esta selección.'
                : 'Cargando catálogo…'}
            </Text>
          </View>
        }
      />

      {/* BOTÓN FLOTANTE (+) */}
      {!moveMode ? (
        <Pressable style={styles.fab} onPress={openQuickAdd}>
          <Text style={styles.fabIcon}>＋</Text>
        </Pressable>
      ) : (
        /* BARRA DE MOVER */
        <View style={styles.moveBar}>
          <Text style={styles.moveBarTitle} numberOfLines={1}>
            ↕ {movingProduct?.name} · posición {movingIndex + 1} de {visibleIds.length}
          </Text>
          <View style={styles.moveRow}>
            <MoveBtn label="⏮ Inicio" disabled={movingIndex <= 0} onPress={() => moveEdge('start')} />
            <MoveBtn label="◀ Antes" disabled={movingIndex <= 0} onPress={() => moveStep(-1)} />
            <MoveBtn label="Después ▶" disabled={movingIndex < 0 || movingIndex >= visibleIds.length - 1} onPress={() => moveStep(1)} />
            <MoveBtn label="Final ⏭" disabled={movingIndex < 0 || movingIndex >= visibleIds.length - 1} onPress={() => moveEdge('end')} />
          </View>
          <View style={styles.moveRow}>
            <MoveBtn label="📂 Cambiar categoría" onPress={openMoveCategory} wide />
            <MoveBtn label="✓ Listo" onPress={() => setMovingId(null)} primary />
          </View>
        </View>
      )}

      {/* MODAL: CAMBIAR DE CATEGORÍA UN PRODUCTO */}
      <Modal visible={showMoveCategory} animationType="slide" transparent onRequestClose={() => setShowMoveCategory(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>📂 Cambiar categoría</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{movingProduct?.name}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setShowMoveCategory(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Categoría:</Text>
              <View style={styles.wrapChips}>
                <Pressable
                  onPress={() => {
                    setTargetGroupId(null);
                    setTargetSubId(null);
                  }}
                  style={[styles.smallChip, targetGroupId === null && styles.smallChipActive]}
                >
                  <Text style={[styles.smallChipText, targetGroupId === null && styles.smallChipTextActive]}>Sin categoría</Text>
                </Pressable>
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setTargetGroupId(g.id);
                      setTargetSubId(null);
                    }}
                    style={[styles.smallChip, targetGroupId === g.id && styles.smallChipActive]}
                  >
                    <Text style={[styles.smallChipText, targetGroupId === g.id && styles.smallChipTextActive]}>
                      {targetGroupId === g.id ? '✓ ' : ''}{g.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {targetSubs.length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>Subcategoría / Presentación:</Text>
                  <View style={styles.wrapChips}>
                    <Pressable
                      onPress={() => setTargetSubId(null)}
                      style={[styles.smallSubChip, targetSubId === null && styles.smallSubChipActive]}
                    >
                      <Text style={[styles.smallSubChipText, targetSubId === null && styles.smallSubChipTextActive]}>Sin subcategoría</Text>
                    </Pressable>
                    {targetSubs.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => setTargetSubId(s.id)}
                        style={[styles.smallSubChip, targetSubId === s.id && styles.smallSubChipActive]}
                      >
                        <Text style={[styles.smallSubChipText, targetSubId === s.id && styles.smallSubChipTextActive]}>
                          {targetSubId === s.id ? '✓ ' : ''}{s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Pressable style={styles.quickSaveBtn} onPress={() => void confirmMoveCategory()}>
                <Text style={styles.quickSaveText}>Mover aquí</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE AÑADIR PRODUCTO RÁPIDO */}
      <Modal
        visible={showQuickModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>＋ Añadir producto rápido</Text>
                <Text style={styles.modalSubtitle}>
                  📂 {activeGroupObj?.name ?? 'Sin categoría'}
                  {activeSubObj ? ` › ${activeSubObj.name}` : ''}
                </Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setShowQuickModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Foto rápida */}
              <View style={styles.photoRow}>
                {quickImage ? (
                  <View style={styles.quickThumbWrap}>
                    <Image source={{ uri: quickImage }} style={styles.quickThumb} contentFit="cover" />
                    <Pressable style={styles.quickThumbDel} onPress={() => setQuickImage(null)}>
                      <Text style={styles.quickThumbDelText}>✕</Text>
                    </Pressable>
                  </View>
                ) : null}
                <Pressable style={styles.photoPickerBtn} onPress={handleQuickPhoto}>
                  <Text style={styles.photoPickerText}>
                    {quickImage ? '📷 Cambiar foto' : '📷 Añadir foto (Cámara / Galería)'}
                  </Text>
                </Pressable>
              </View>

              {/* Nombre */}
              <Text style={styles.fieldLabel}>Nombre</Text>
              <TextInput
                style={styles.fieldInput}
                value={quickName}
                onChangeText={setQuickName}
                placeholder="Ej. Postobón 350ml, Empanada..."
                autoFocus={true}
              />

              {/* Precio */}
              <Text style={styles.fieldLabel}>
                Precio {quickCents && quickCents > 0 ? `(${formatPrice(quickCents)})` : ''}
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={quickPrice}
                onChangeText={setQuickPrice}
                keyboardType="decimal-pad"
                placeholder="Ej. 2500 o 2.500"
              />

              {/* Categoría (pre-seleccionada automáticamente) */}
              <Text style={styles.fieldLabel}>Categoría detectada:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {groups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setQuickGroupId(g.id);
                      setQuickSubcategoryId(null);
                    }}
                    style={[styles.smallChip, quickGroupId === g.id && styles.smallChipActive]}
                  >
                    <Text style={[styles.smallChipText, quickGroupId === g.id && styles.smallChipTextActive]}>
                      {quickGroupId === g.id ? '✓ ' : ''}{g.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Subcategoría (si la categoría seleccionada tiene) */}
              {quickAvailableSubs.length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>Subcategoría / Presentación:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                    <Pressable
                      onPress={() => setQuickSubcategoryId(null)}
                      style={[styles.smallSubChip, quickSubcategoryId === null && styles.smallSubChipActive]}
                    >
                      <Text style={[styles.smallSubChipText, quickSubcategoryId === null && styles.smallSubChipTextActive]}>
                        Sin subcategoría
                      </Text>
                    </Pressable>
                    {quickAvailableSubs.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => setQuickSubcategoryId(s.id)}
                        style={[styles.smallSubChip, quickSubcategoryId === s.id && styles.smallSubChipActive]}
                      >
                        <Text style={[styles.smallSubChipText, quickSubcategoryId === s.id && styles.smallSubChipTextActive]}>
                          {quickSubcategoryId === s.id ? '✓ ' : ''}{s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {/* Botón Guardar */}
              <Pressable style={styles.quickSaveBtn} onPress={handleSaveQuick}>
                <Text style={styles.quickSaveText}>＋ Guardar y agregar al catálogo</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SINCRONIZACIÓN Y RESPALDO */}
      <SyncModal visible={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MoveBtn({
  label,
  onPress,
  disabled,
  primary,
  wide,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.moveBtn, wide && { flex: 2 }, primary && styles.moveBtnPrimary, disabled && styles.moveBtnDisabled]}
    >
      <Text style={[styles.moveBtnText, primary && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function SubChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.subChip, active && styles.subChipActive]}>
      <Text style={[styles.subChipText, active && styles.subChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf4ea' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  search: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e8d7c2',
  },
  syncHeaderBtn: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  chipsRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { paddingHorizontal: 8, paddingVertical: 6, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#efdcc2',
    borderWidth: 1,
    borderColor: '#e2cdb3',
  },
  chipActive: { backgroundColor: '#b3541e', borderColor: '#8b3f14' },
  chipText: { color: '#5a3a1a', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#fff' },

  subChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5eadb',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eedac4',
  },
  subChips: { paddingHorizontal: 8, paddingVertical: 5, gap: 6 },
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dec9b0',
  },
  subChipActive: { backgroundColor: '#6e3c12', borderColor: '#4a2507' },
  subChipText: { color: '#6e3c12', fontWeight: '600', fontSize: 12 },
  subChipTextActive: { color: '#fff', fontWeight: '700' },

  hintWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f5ecdf',
  },
  hintText: { fontSize: 11, color: '#7a6a58', textAlign: 'center' },
  hintBold: { fontWeight: '800', color: '#5a3a1a' },
  hintMoving: { color: '#1565c0' },

  /* Barra de mover */
  moveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#12385f',
    padding: 12,
    paddingBottom: 16,
    gap: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    elevation: 12,
    zIndex: 999,
  },
  moveBarTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  moveRow: { flexDirection: 'row', gap: 6 },
  moveBtn: {
    flex: 1,
    backgroundColor: '#e3eefb',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnPrimary: { backgroundColor: '#2e7d32' },
  moveBtnDisabled: { opacity: 0.35 },
  moveBtnText: { color: '#12385f', fontWeight: '800', fontSize: 12 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },

  grid: { padding: PAD, paddingBottom: 110 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  empty: { textAlign: 'center', color: '#8a7a68', fontSize: 15 },
  retryBtn: { marginTop: 14, backgroundColor: '#b3541e', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  /* Floating Action Button (FAB) */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#b3541e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    marginTop: -3,
  },

  /* Modal Rápido */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fbf4ea',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: '#e8d4be',
    paddingBottom: 12,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#5a3a1a',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b3541e',
    marginTop: 2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eeddcb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6e3c12',
  },
  modalBody: {
    paddingBottom: 24,
    gap: 8,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  quickThumbWrap: {
    position: 'relative',
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
  },
  quickThumb: {
    width: '100%',
    height: '100%',
  },
  quickThumbDel: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickThumbDelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  photoPickerBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2cfb7',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  photoPickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8a4b14',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5a3a1a',
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e4cdb2',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  smallChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eeddcb',
  },
  smallChipActive: {
    backgroundColor: '#b3541e',
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5a3a1a',
  },
  smallChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  smallSubChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dec9b0',
  },
  smallSubChipActive: {
    backgroundColor: '#6e3c12',
    borderColor: '#4a2507',
  },
  smallSubChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6e3c12',
  },
  smallSubChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  quickSaveBtn: {
    backgroundColor: '#b3541e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  quickSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
