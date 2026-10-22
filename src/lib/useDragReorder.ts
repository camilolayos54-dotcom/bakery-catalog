// Hold a card, drag it over the grid, drop it where you want. Built on React Native's own PanResponder
// (no gesture-handler / reanimated), so it works on Android and on the web.
//
// How it fits together:
//  - The card reports a long press (`startDrag`) -> the hook enters drag mode and shows a "ghost" of the card
//    that follows the finger.
//  - A PanResponder on the list container captures the finger from then on (scrolling is switched off).
//  - Hovering a cell reorders a *preview* (`order`); lifting the finger commits it through `onCommit`.
//  - Near the top/bottom edge the list scrolls by itself.

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  type FlatList,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type View,
} from 'react-native';

import { moveToIndex } from '@/lib/order';

const EDGE = 90; // px from the top/bottom of the list that start auto-scrolling
const SCROLL_STEP = 14; // px per tick (16 ms)

type Options = {
  /** Ids in the order they are currently shown. */
  ids: number[];
  /** Reordering allowed in this view (not in Frecuentes / Promociones). */
  enabled: boolean;
  columns: number;
  cardWidth: number;
  /** Padding around the grid (contentContainerStyle). */
  pad: number;
  onCommit: (order: number[]) => Promise<void> | void;
  onBlocked: () => void;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function useDragReorder({ ids, enabled, columns, cardWidth, pad, onCommit, onBlocked }: Options) {
  const [drag, setDrag] = useState<{ id: number; order: number[] } | null>(null);

  const s = useRef({
    active: false,
    moved: false,
    id: 0,
    order: [] as number[],
    x: 0,
    y: 0,
    dir: 0 as -1 | 0 | 1,
    timer: null as ReturnType<typeof setInterval> | null,
  });
  const box = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const scrollY = useRef(0);
  /** While auto-scrolling we count the offset ourselves: scroll events can lag behind our ticks. */
  const target = useRef(0);
  const contentH = useRef(0);
  const rowH = useRef(0);
  const containerRef = useRef<View>(null);
  const listRef = useRef<FlatList<any>>(null);
  const ghost = useRef(new Animated.ValueXY({ x: -2000, y: -2000 })).current;

  // Gesture callbacks are created once; they read the latest options through this ref.
  const latest = useRef({ ids, enabled, columns, cardWidth, pad, onCommit, onBlocked });
  latest.current = { ids, enabled, columns, cardWidth, pad, onCommit, onBlocked };

  /** Moves the ghost under the finger and reorders the preview to the hovered cell. */
  const place = () => {
    const { x, y } = s.current;
    const o = latest.current;
    const b = box.current;
    const h = rowH.current || o.cardWidth;
    ghost.setValue({ x: x - b.x - o.cardWidth / 2, y: y - b.y - h / 2 });

    const col = clamp(Math.floor((x - b.x - o.pad) / o.cardWidth), 0, o.columns - 1);
    const offset = s.current.dir !== 0 ? target.current : scrollY.current;
    const row = Math.max(0, Math.floor((y - b.y + offset - o.pad) / h));
    const idx = clamp(row * o.columns + col, 0, s.current.order.length - 1);
    const next = moveToIndex(s.current.order, s.current.id, idx);
    if (next.join(',') !== s.current.order.join(',')) {
      s.current.order = next;
      setDrag({ id: s.current.id, order: next });
    }
  };

  const tick = () => {
    const d = s.current.dir;
    if (!d) return;
    // Some platforms never report the content size: estimate it from rows x card height (+ bottom space).
    const o = latest.current;
    const estimated = Math.ceil(s.current.order.length / o.columns) * (rowH.current || o.cardWidth) + o.pad * 2 + 110;
    const max = Math.max(0, (contentH.current || estimated) - box.current.h);
    target.current = clamp(target.current + d * SCROLL_STEP, 0, max);
    listRef.current?.scrollToOffset({ offset: target.current, animated: false });
    place();
  };

  const setDir = (d: -1 | 0 | 1) => {
    if (d === s.current.dir) return;
    if (s.current.dir === 0) target.current = scrollY.current; // starting to auto-scroll from where we are
    s.current.dir = d;
    if (d !== 0 && !s.current.timer) s.current.timer = setInterval(tick, 16);
    if (d === 0 && s.current.timer) {
      clearInterval(s.current.timer);
      s.current.timer = null;
    }
  };

  const finish = async (commit: boolean) => {
    if (!s.current.active) return;
    s.current.active = false;
    setDir(0);
    const order = s.current.order;
    if (commit && order.join(',') !== latest.current.ids.join(',')) await latest.current.onCommit(order);
    setDrag(null);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => s.current.active,
      onMoveShouldSetPanResponderCapture: () => s.current.active,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        s.current.moved = true;
      },
      onPanResponderMove: (_e, g) => {
        s.current.x = g.moveX;
        s.current.y = g.moveY;
        const rel = g.moveY - box.current.y;
        setDir(rel < EDGE ? -1 : rel > box.current.h - EDGE ? 1 : 0);
        place();
      },
      onPanResponderRelease: () => void finish(true),
      onPanResponderTerminate: () => void finish(false),
    }),
  ).current;

  useEffect(
    () => () => {
      if (s.current.timer) clearInterval(s.current.timer);
    },
    [],
  );

  /** Called by a card after it was held long enough. */
  const startDrag = (id: number, e?: GestureResponderEvent) => {
    if (!latest.current.enabled) return latest.current.onBlocked();
    const ne: any = e?.nativeEvent;
    s.current.active = true;
    s.current.moved = false;
    s.current.id = id;
    s.current.order = latest.current.ids.slice();
    s.current.x = Number.isFinite(ne?.pageX) ? ne.pageX : box.current.x + box.current.w / 2;
    s.current.y = Number.isFinite(ne?.pageY) ? ne.pageY : box.current.y + box.current.h / 2;
    setDrag({ id, order: s.current.order });
    containerRef.current?.measureInWindow((x, y, w, h) => {
      box.current = { x, y, w, h };
      place();
    });
  };

  /** The finger went up on a card: if it never moved, there is nothing to drop. */
  const onPressOut = () => {
    setTimeout(() => {
      if (s.current.active && !s.current.moved) void finish(false);
    }, 0);
  };

  return {
    /** Product being dragged and the live preview order, or null. */
    drag,
    ghost,
    containerRef,
    listRef,
    panHandlers: pan.panHandlers,
    startDrag,
    onPressOut,
    onCardLayout: (e: LayoutChangeEvent) => {
      rowH.current = e.nativeEvent.layout.height;
    },
    onContainerLayout: () => {
      containerRef.current?.measureInWindow((x, y, w, h) => {
        box.current = { x, y, w, h };
      });
    },
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    onContentSizeChange: (_w: number, h: number) => {
      contentH.current = h;
    },
  };
}
